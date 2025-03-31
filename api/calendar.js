// api/calendar.js
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
import {
  getFromCache,
  logCache,
  setCache,
  resetCache,
} from '../lib/googleCache.js';
import {
  verificarConflitoHorario,
  criarEventoCalendar,
} from '../lib/googleCalendarUtils.js';

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
    let busySlots = getFromCache(calendarId, startDay, endDay);

    if (!busySlots) {
      const calendar = google.calendar({ version: 'v3', auth });
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

    console.log(' - NOVO LOGO CACHE - ');
    logCache();
    return res.json({ horariosDisponiveis });
  } catch (err) {
    console.error('[ERRO] /disponibilidade:', err.message);
    res.status(500).json({ erro: 'Falha ao consultar disponibilidade' });
  }
});

router.post('/add-event', async (req, res) => {
  if (!checkApiKey(req, res)) return;

  try {
    const { data, hora, titulo = 'Agendamento', telefone } = req.body;

    if (!data || !hora || !telefone) {
      return res
        .status(400)
        .json({ erro: 'Parâmetros obrigatórios: data, hora e telefone' });
    }

    const dataISO = normalizarISO(data);
    const dataBase = parseDateParam(dataISO);

    const [hourStr, minuteStr = '00'] = hora.trim().split(':');
    const hour = parseInt(hourStr, 10);
    const minute = parseInt(minuteStr, 10);

    if (isNaN(hour) || isNaN(minute)) {
      return res
        .status(400)
        .json({ erro: 'Hora inválida. Formato esperado: HH:mm' });
    }

    const inicio = new Date(
      dataBase.getFullYear(),
      dataBase.getMonth(),
      dataBase.getDate(),
      hour,
      minute,
      0,
    );
    const fim = new Date(inicio.getTime() + slotIntervalMinutes * 60000);

    const auth = getAuthClient();

    const temConflito = await verificarConflitoHorario(
      auth,
      calendarId,
      inicio,
      fim,
    );
    if (temConflito) {
      return res.status(409).json({
        erro: 'Horário indisponível. Já existe um evento neste intervalo.',
      });
    }

    const eventoId = await criarEventoCalendar(auth, calendarId, {
      nome: titulo,
      telefone,
      inicio,
      fim,
    });

    resetCache();

    return res.status(201).json({
      mensagem: 'Evento criado com sucesso',
      eventoId,
      horario: dataISO + ' ' + hora,
    });
  } catch (err) {
    console.error('[ERRO] /add-event:', err.message);
    res.status(500).json({ erro: 'Erro ao adicionar evento no calendário' });
  }
});

export default router;
