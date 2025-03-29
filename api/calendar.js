import express from 'express';
import { google } from 'googleapis';
import dotenv from 'dotenv';
import { getAuthClient } from '../lib/googleAuth.js';
import { checkApiKey } from '../lib/verifyAuth.js';
import {
  parseDateParam,
  contarDiasUteis,
  normalizarISO,
} from '../lib/dateUtils.js';
import { calcularDisponibilidade } from '../lib/disponibilidade.js';
import { getFromCache, setCache } from '../lib/googleCache.js';

dotenv.config();
const router = express.Router();

const MAX_DIAS_UTEIS = parseInt(process.env.MAX_WORK_DAYS || '20', 10);
const openingHour = process.env.OPENING_HOUR || '09:00:00';
const closingHour = process.env.CLOSING_HOUR || '18:00:00';
const slotIntervalMinutes = parseInt(process.env.INTERVAL_MINUTES || '60', 10);
const validWeekDays = (process.env.VALID_WEEKDAYS || '1,2,3,4,5')
  .split(',')
  .map(Number);
const calendarId = process.env.GOOGLE_CALENDAR_ID;

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
      ? diasVetados.map(normalizarISO)
      : [normalizarISO(diasVetados)];

    const horarios = Array.isArray(horariosVetados)
      ? horariosVetados.map(h => h.slice(0, 5))
      : [horariosVetados.slice(0, 5)];

    const startDay = parseDateParam(agendar_apartir_de);
    let endDay = parseDateParam(agendar_ateh);

    let diasUteisNoIntervalo = contarDiasUteis(startDay, endDay);

    if (diasUteisNoIntervalo > MAX_DIAS_UTEIS) {
      let diasCortados = 0;
      let dataLimite = new Date(startDay);

      while (diasCortados < MAX_DIAS_UTEIS) {
        const diaSemana = dataLimite.getDay();
        if (diaSemana >= 1 && diaSemana <= 5) diasCortados++;
        if (diasCortados < MAX_DIAS_UTEIS) {
          dataLimite.setDate(dataLimite.getDate() + 1);
        }
      }

      endDay = new Date(dataLimite);
      diasUteisNoIntervalo = MAX_DIAS_UTEIS;
    }

    const auth = getAuthClient();
    const calendar = google.calendar({ version: 'v3', auth });

    let busySlots = getFromCache(calendarId, startDay, endDay);

    if (!busySlots) {
      const { data } = await calendar.freebusy.query({
        requestBody: {
          timeMin: new Date(startDay.getTime()).toISOString(),
          timeMax: new Date(
            endDay.getTime() + 24 * 60 * 60 * 1000,
          ).toISOString(),
          timeZone: 'America/Sao_Paulo',
          items: [{ id: calendarId }],
        },
      });

      busySlots = data.calendars[calendarId].busy.map(slot => ({
        start: new Date(slot.start),
        end: new Date(slot.end),
      }));

      setCache(calendarId, startDay, endDay, busySlots);
    }

    const horariosDisponiveis = calcularDisponibilidade({
      startDay,
      endDay,
      diasVetados: dias,
      horariosVetados: horarios,
      busySlots,
      openingHour,
      closingHour,
      slotIntervalMinutes,
      validWeekDays,
    });

    return res.json({ horariosDisponiveis });
  } catch (err) {
    console.error('[ERRO] /disponibilidade:', err.message);
    res.status(500).json({ erro: 'Falha ao consultar disponibilidade' });
  }
});

export default router;
