// lib/disponibilidade.js
import { parseTimeToDate, formatISODate, formatTime } from './dateUtils.js';

export function calcularDisponibilidade({
  startDay,
  endDay,
  diasVetados,
  horariosVetados,
  busySlots,
  openingHour = '09:00:00',
  closingHour = '18:00:00',
  slotIntervalMinutes = 60,
  validWeekDays = [1, 2, 3, 4, 5],
}) {
  const horariosDisponiveis = {};
  let currentDate = new Date(startDay);

  const diasVetadosSet = new Set(diasVetados);
  const horariosVetadosSet = new Set(horariosVetados);

  while (currentDate <= endDay) {
    const diaSemana = currentDate.getDay();
    const currentISO = formatISODate(currentDate);

    if (!validWeekDays.includes(diaSemana) || diasVetadosSet.has(currentISO)) {
      currentDate.setDate(currentDate.getDate() + 1);
      continue;
    }

    let slotStart = parseTimeToDate(currentDate, openingHour);
    const slotEnd = parseTimeToDate(currentDate, closingHour);
    const slotsDoDia = [];

    while (slotStart < slotEnd) {
      const timeStr = formatTime(slotStart);

      const isBusy = busySlots.some(
        busy => slotStart >= busy.start && slotStart < busy.end,
      );

      const isBlocked = horariosVetadosSet.has(timeStr);

      if (!isBusy && !isBlocked) {
        slotsDoDia.push(timeStr);
      }

      slotStart = new Date(slotStart.getTime() + slotIntervalMinutes * 60000);
    }

    if (slotsDoDia.length > 0) {
      horariosDisponiveis[currentISO] = slotsDoDia;
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return horariosDisponiveis;
}
