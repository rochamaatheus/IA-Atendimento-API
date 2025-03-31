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
      dateTime: inicio.toISOString(),
      timeZone: 'America/Sao_Paulo',
    },
    end: {
      dateTime: fim.toISOString(),
      timeZone: 'America/Sao_Paulo',
    },
  };

  const response = await calendar.events.insert({
    calendarId,
    requestBody: evento,
  });

  return response.data.id;
}
