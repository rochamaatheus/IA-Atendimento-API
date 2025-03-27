import express from 'express';
import { google } from 'googleapis';
import { DateTime } from 'luxon';
import { getAuthClient } from '../lib/googleAuth.js';
import { checkApiKey } from '../lib/verifyAuth.js';

const router = express.Router();

const MAX_DIAS_UTEIS = 20;

function parseDateParam(str) {
  return DateTime.fromISO(str, { zone: 'utc' })
    .plus({ hours: 3 })
    .setZone('America/Sao_Paulo')
    .startOf('day');
}

function parseTimeToLuxon(baseDate, timeStr) {
  const [hour, minute, second] = timeStr.split(':').map(Number);
  return baseDate.set({ hour, minute, second });
}

function contarDiasUteis(inicio, fim) {
  let count = 0;
  let data = inicio;

  while (data <= fim) {
    if (data.weekday >= 1 && data.weekday <= 5) {
      count++;
    }
    data = data.plus({ days: 1 });
  }

  return count;
}

router.post('/disponibilidade', async (req, res) => {
  if (!checkApiKey(req, res)) return;

  try {
    const {
      agendar_apartir_de,
      agendar_ateh,
      diasVetados = [],
      horariosVetados = [],
    } = req.body;

    if (!agendar_apartir_de || !agendar_ateh) {
      return res.status(400).json({ erro: 'Parâmetros obrigatórios ausentes' });
    }

    const dias = Array.isArray(diasVetados)
      ? diasVetados
      : diasVetados
      ? [diasVetados]
      : [];

    const horarios = Array.isArray(horariosVetados)
      ? horariosVetados
      : horariosVetados
      ? [horariosVetados]
      : [];

    const openingHour = '09:00:00';
    const closingHour = '18:00:00';
    const slotIntervalMinutes = 60;
    const validWeekDays = [1, 2, 3, 4, 5];

    const startDay = parseDateParam(agendar_apartir_de);
    const endDay = parseDateParam(agendar_ateh);

    const diasUteisNoIntervalo = contarDiasUteis(startDay, endDay);
    if (diasUteisNoIntervalo > MAX_DIAS_UTEIS) {
      return res.status(400).json({
        erro: `O período solicitado excede o limite de ${MAX_DIAS_UTEIS} dias úteis permitidos.`,
        diasUteisSolicitados: diasUteisNoIntervalo,
      });
    }

    const auth = getAuthClient();
    const calendar = google.calendar({ version: 'v3', auth });

    const { data } = await calendar.freebusy.query({
      requestBody: {
        timeMin: parseTimeToLuxon(startDay, openingHour).toISO(),
        timeMax: parseTimeToLuxon(endDay, closingHour).toISO(),
        timeZone: 'America/Sao_Paulo',
        items: [{ id: 'matheussilveirarocha.sc@gmail.com' }],
      },
    });

    const busySlots = data.calendars[
      'matheussilveirarocha.sc@gmail.com'
    ].busy.map(slot => ({
      start: new Date(slot.start),
      end: new Date(slot.end),
    }));

    const horariosDisponiveis = {};
    let currentDate = startDay;

    while (currentDate <= endDay) {
      const currentISO = currentDate.toISODate();

      if (
        !validWeekDays.includes(currentDate.weekday) ||
        dias.includes(currentISO)
      ) {
        currentDate = currentDate.plus({ days: 1 });
        continue;
      }

      let slotStart = parseTimeToLuxon(currentDate, openingHour);
      const slotEnd = parseTimeToLuxon(currentDate, closingHour);
      const slotsDoDia = [];

      while (slotStart < slotEnd) {
        const slotJSDate = slotStart.toJSDate();
        const timeStr = slotStart.toFormat('HH:mm:ss');

        const isBusy = busySlots.some(
          busy => slotJSDate >= busy.start && slotJSDate < busy.end,
        );

        const isBlocked = horarios.includes(timeStr);

        if (!isBusy && !isBlocked) {
          slotsDoDia.push(slotStart.toFormat('HH:mm'));
        }

        slotStart = slotStart.plus({ minutes: slotIntervalMinutes });
      }

      if (slotsDoDia.length > 0) {
        horariosDisponiveis[currentISO] = slotsDoDia;
      }

      currentDate = currentDate.plus({ days: 1 });
    }

    return res.json({ horariosDisponiveis });
  } catch (err) {
    console.error('Erro ao calcular disponibilidade:', err);
    res.status(500).json({ erro: 'Falha ao consultar disponibilidade' });
  }
});

export default router;
