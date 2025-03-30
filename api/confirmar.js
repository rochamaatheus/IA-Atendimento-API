import express from 'express';
import { google } from 'googleapis';
import { checkApiKey } from '../lib/verifyAuth.js';
import { getAuthClient } from '../lib/googleAuth.js';
import { parseDateParam, normalizarISO } from '../lib/dateUtils.js';
import {
  normalizarTelefone,
  normalizarCPF,
  buscarUsuarioPorTelefone,
} from '../lib/sheetsUtils.js';
import { resetCache } from '../lib/googleCache.js';

const router = express.Router();

router.post('/confirmar-agendamento', async (req, res) => {
  if (!checkApiKey(req, res)) return;

  try {
    const { cpf, nome, telefone, data_agendamento } = req.body;

    if (!cpf || !nome || !telefone || !data_agendamento) {
      return res.status(400).json({ erro: 'Campos obrigatórios ausentes' });
    }

    const telefoneNormalizado = normalizarTelefone(telefone);
    const cpfFormatado = normalizarCPF(cpf);
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

    // Verificar conflitos no Google Calendar
    const auth = getAuthClient();
    const calendar = google.calendar({ version: 'v3', auth });
    const calendarId = process.env.GOOGLE_CALENDAR_ID;
    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = '1Ib3yOXjDEQLmUyzhrXPjPUhxqyy6CNHwncIC81i70GE';
    const range = 'Página1!A1:E';

    const { data: busy } = await calendar.freebusy.query({
      requestBody: {
        timeMin: inicio.toISOString(),
        timeMax: fim.toISOString(),
        timeZone: 'America/Sao_Paulo',
        items: [{ id: calendarId }],
      },
    });

    if (busy.calendars[calendarId].busy.length > 0) {
      return res.status(409).json({
        erro: 'Horário já está ocupado no calendário',
      });
    }

    // Criar evento no Google Calendar
    const evento = {
      summary: `Consulta - ${nome}`,
      description: `Agendamento confirmado para ${nome}`,
      start: { dateTime: inicio.toISOString(), timeZone: 'America/Sao_Paulo' },
      end: { dateTime: fim.toISOString(), timeZone: 'America/Sao_Paulo' },
    };

    await calendar.events.insert({
      calendarId,
      requestBody: evento,
    });

    // Atualizar planilha
    const { data: planilha } = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const valores = planilha.values || [];
    const usuario = buscarUsuarioPorTelefone(valores, telefoneNormalizado);

    if (usuario) {
      // Atualizar linha existente
      const index = valores.findIndex(
        l => l[2] && normalizarTelefone(l[2]) === telefoneNormalizado,
      );
      const linhaIndex = index + 1; // índice real (1-based)

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `Página1!E${linhaIndex}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [
            [
              `${String(dataBase.getDate()).padStart(2, '0')}/${String(
                dataBase.getMonth() + 1,
              ).padStart(2, '0')}/${dataBase.getFullYear()}`,
            ],
          ],
        },
      });
    } else {
      // Adicionar nova linha
      const novaLinha = [
        cpfFormatado,
        nome,
        `'${telefoneNormalizado}`,
        '',
        `${String(dataBase.getDate()).padStart(2, '0')}/${String(
          dataBase.getMonth() + 1,
        ).padStart(2, '0')}/${dataBase.getFullYear()}`,
      ];

      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'Página1!A:E',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [novaLinha] },
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
