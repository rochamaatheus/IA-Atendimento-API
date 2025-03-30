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
} from '../lib/googleCalendarUtils.js';
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

    const [hourStr, minuteStr = '00'] = data_agendamento
      .split(' ')[1]
      .split(':');
    const hour = parseInt(hourStr, 10);
    const minute = parseInt(minuteStr, 10);

    const inicio = new Date(
      dataBase.getFullYear(),
      dataBase.getMonth(),
      dataBase.getDate(),
      hour,
      minute,
      0,
    );
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
      descricao: `Agendamento confirmado para ${nome}`,
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

export default router;
