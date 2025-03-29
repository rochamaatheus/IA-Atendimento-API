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

  while (currentDate <= endDay) {
    const diaSemana = currentDate.getDay(); // 0 (domingo) a 6 (sábado)
    const currentISO = formatISODate(currentDate);

    if (
      !validWeekDays.includes(diaSemana) ||
      diasVetados.includes(currentISO)
    ) {
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

      const isBlocked = horariosVetados.includes(timeStr);

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
