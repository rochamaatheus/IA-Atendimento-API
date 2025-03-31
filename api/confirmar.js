import express from 'express';
import dotenv from 'dotenv';
import { checkApiKey } from '../lib/verifyAuth.js';
import { getAuthClient } from '../lib/googleAuth.js';
import {
  parseDateParam,
  normalizarISO,
  formatarDataBrasileira,
} from '../lib/dateUtils.js';
import { normalizarTelefone } from '../lib/sheetsUtils.js';
import {
  atualizarConsultaNaPlanilha,
  adicionarNovaLinhaLead,
  buscarDadosPlanilha,
  getSheetsClient,
} from '../lib/sheetsService.js';
import {
  verificarConflitoHorario,
  criarEventoCalendar,
  parseHorarioLocal,
} from '../lib/googleCalendarUtils.js';
import { google } from 'googleapis';
import { resetCache } from '../lib/googleCache.js';

dotenv.config();
const router = express.Router();
const calendarId = process.env.GOOGLE_CALENDAR_ID;
const spreadsheetId = '1Ib3yOXjDEQLmUyzhrXPjPUhxqyy6CNHwncIC81i70GE';

router.post('/confirmar-agendamento', async (req, res) => {
  if (!checkApiKey(req, res)) return;

  try {
    const { cpf, nome, telefone, data_agendamento } = req.body;

    if (!cpf || !nome || !telefone || !data_agendamento) {
      return res.status(400).json({ erro: 'Campos obrigatórios ausentes' });
    }

    const telefoneNormalizado = normalizarTelefone(telefone);
    const dataISO = normalizarISO(data_agendamento);
    const dataBase = parseDateParam(dataISO);

    const inicio = parseHorarioLocal(data_agendamento);
    const fim = new Date(inicio.getTime() + 60 * 60000);

    const dataFormatada = formatarDataBrasileira(dataBase);

    const auth = getAuthClient();
    const sheets = getSheetsClient(auth);

    // Verifica conflito
    const conflito = await verificarConflitoHorario(
      auth,
      calendarId,
      inicio,
      fim,
    );
    if (conflito) {
      return res.status(409).json({ erro: 'Horário já ocupado no calendário' });
    }

    // Cria evento
    await criarEventoCalendar(auth, calendarId, {
      nome,
      telefone,
      inicio,
      fim,
    });

    // Atualiza ou adiciona linha na planilha
    const valores = await buscarDadosPlanilha(
      sheets,
      spreadsheetId,
      'Página1!A1:E',
    );

    const atualizado = await atualizarConsultaNaPlanilha(
      sheets,
      spreadsheetId,
      telefoneNormalizado,
      dataFormatada,
      valores,
    );

    if (!atualizado) {
      await adicionarNovaLinhaLead(sheets, spreadsheetId, {
        cpf,
        nome,
        telefone,
        dataConsulta: dataFormatada,
      });
    }

    resetCache();

    return res.status(201).json({
      mensagem: 'Agendamento confirmado com sucesso',
      data: data_agendamento,
    });
  } catch (err) {
    console.error('[ERRO] /confirmar-agendamento:', err.message);
    res.status(500).json({ erro: 'Erro ao confirmar agendamento' });
  }
});

router.post('/cancelar-evento', async (req, res) => {
  if (!checkApiKey(req, res)) return;

  try {
    const { telefone, dataConsulta } = req.body;

    if (!telefone || !dataConsulta) {
      return res
        .status(400)
        .json({ erro: 'Campos obrigatórios: telefone e dataConsulta' });
    }

    const telefoneNormalizado = normalizarTelefone(telefone);
    const telefoneRaw = telefoneNormalizado.replace(/\D/g, '');
    const dataISO = normalizarISO(dataConsulta);
    const dataBase = parseDateParam(dataISO);

    const inicioDia = new Date(dataBase);
    inicioDia.setHours(0, 0, 0, 0);

    const fimDia = new Date(dataBase);
    fimDia.setHours(23, 59, 59, 999);

    const auth = getAuthClient();
    const calendar = google.calendar({ version: 'v3', auth });

    const { data } = await calendar.events.list({
      calendarId,
      timeMin: inicioDia.toISOString(),
      timeMax: fimDia.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });

    const eventos = data.items || [];

    const evento = eventos.find(e => {
      const desc = (e.description || '').replace(/\D/g, '');
      return desc.includes(telefoneRaw);
    });

    if (!evento) {
      return res.status(404).json({
        erro: 'Nenhum evento encontrado com esse telefone e data',
      });
    }

    // Deleta o evento no calendário
    await calendar.events.delete({
      calendarId,
      eventId: evento.id,
    });

    // Reseta cache de disponibilidade
    resetCache();

    // Limpa próxima consulta na planilha
    const sheets = getSheetsClient(auth);
    const valores = await buscarDadosPlanilha(
      sheets,
      spreadsheetId,
      'Página1!A1:Z',
    );
    const header = valores[0];
    const linhas = valores.slice(1);

    const colTelefone = header.indexOf('Telefone');
    const colProximaConsulta = header.indexOf('Próxima consulta');

    if (colTelefone !== -1 && colProximaConsulta !== -1) {
      const linhaIndex = linhas.findIndex(linha => {
        const telPlanilha = normalizarTelefone(linha[colTelefone] || '');
        return telPlanilha === telefoneNormalizado;
      });

      if (linhaIndex !== -1) {
        const rangeLinha = `Página1!A${linhaIndex + 2}:Z${linhaIndex + 2}`;
        const novaLinha = [...linhas[linhaIndex]];
        while (novaLinha.length <= colProximaConsulta) novaLinha.push('');
        novaLinha[colProximaConsulta] = '';

        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: rangeLinha,
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [novaLinha],
          },
        });

        console.log(
          `[OK] Próxima consulta limpa na planilha (linha ${linhaIndex + 2})`,
        );
      }
    }

    return res.status(200).json({
      mensagem: 'Evento cancelado com sucesso',
      eventoId: evento.id,
      data: dataConsulta,
    });
  } catch (err) {
    console.error('[ERRO] /cancelar-evento:', err.message);
    res.status(500).json({ erro: 'Erro ao cancelar evento automaticamente' });
  }
});

export default router;
