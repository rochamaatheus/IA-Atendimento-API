/**
 * Transforma uma string de data
 */
export function parseDateParam(str) {
  const [year, month, day] = str.split('T')[0].split('-').map(Number);

  if (!year || !month || !day) {
    throw new Error(`Data inválida: "${str}"`);
  }

  // Cria data fixa no fuso local
  return new Date(year, month - 1, day);
}

/**
 * Junta uma data e uma string de horário e retorna um objeto Date.
 */
export function parseTimeToDate(baseDate, timeStr = '00:00:00') {
  const [hour, minute, second] = timeStr.split(':').map(Number);
  return new Date(
    baseDate.getFullYear(),
    baseDate.getMonth(),
    baseDate.getDate(),
    hour,
    minute,
    second || 0,
  );
}

/**
 * Conta os dias úteis entre duas datas, inclusive.
 */
export function contarDiasUteis(inicio, fim) {
  let count = 0;
  let data = new Date(inicio);
  while (data <= fim) {
    const diaSemana = data.getDay();
    if (diaSemana >= 1 && diaSemana <= 5) count++;
    data.setDate(data.getDate() + 1);
  }
  return count;
}

/**
 * Formata um Date para 'YYYY-MM-DD'.
 */
export function formatISODate(date) {
  return date.toISOString().split('T')[0];
}

/**
 * Formata um Date para 'HH:mm'.
 */
export function formatTime(date) {
  return date.toTimeString().slice(0, 5);
}

/**
 * Garante que uma string qualquer de data vira 'YYYY-MM-DD' (zero-padded).
 */
export function normalizarISO(str) {
  const date = new Date(str);
  if (isNaN(date)) throw new Error(`Data inválida para normalizar: ${str}`);
  return date.toISOString().split('T')[0];
}
