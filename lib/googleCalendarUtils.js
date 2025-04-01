// lib/googleCalendarUtils.js

import { google } from 'googleapis';
import { normalizarTelefone } from './sheetsUtils.js';

/**
 * Verifica se existe conflito de horário no Google Calendar
 */
export async function verificarConflitoHorario(auth, calendarId, inicio, fim) {
  const calendar = google.calendar({ version: 'v3', auth });

  const { data } = await calendar.freebusy.query({
    requestBody: {
      timeMin: inicio.toISOString(),
      timeMax: fim.toISOString(),
      timeZone: 'America/Sao_Paulo',
      items: [{ id: calendarId }],
    },
  });

  return data.calendars[calendarId].busy.length > 0;
}

/**
 * Garante horário local
 */
export function parseHorarioLocal(str) {
  if (!str.includes(' ')) {
    throw new Error(
      'Formato de data inválido: deve conter espaço entre data e hora',
    );
  }

  const [data, hora] = str.trim().split(' ');
  const isBR = data.includes('/'); // Detecta se é BR (dd/mm/yyyy) ou ISO (yyyy-mm-dd)

  let dia, mes, ano;

  if (isBR) {
    [dia, mes, ano] = data.split('/').map(Number);
  } else {
    [ano, mes, dia] = data.split('-').map(Number);
  }

  const [h, m, s = '00'] = hora.split(':').map(Number);

  return new Date(ano, mes - 1, dia, h, m, parseInt(s));
}

/**
 * Cria um evento no Google Calendar
 */
export async function criarEventoCalendar(
  auth,
  calendarId,
  { nome, telefone, inicio, fim },
) {
  const calendar = google.calendar({ version: 'v3', auth });

  const evento = {
    summary: `Consulta - ${nome}`,
    description: `Agendamento confirmado para ${nome}\nTelefone: ${normalizarTelefone(
      telefone,
    )}`,
    start: {
      dateTime: inicio,
      timeZone: 'America/Sao_Paulo',
    },
    end: {
      dateTime: fim,
      timeZone: 'America/Sao_Paulo',
    },
  };

  const response = await calendar.events.insert({
    calendarId,
    requestBody: evento,
  });

  return response.data.id;
}
