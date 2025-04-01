// lib/dateUtils.js
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

/**
 * Formata um Date para 'DD/MM/YYYY' (brasileiro).
 */
export function formatarDataBrasileira(date) {
  const dia = String(date.getDate()).padStart(2, '0');
  const mes = String(date.getMonth() + 1).padStart(2, '0');
  const ano = date.getFullYear();
  return `${dia}/${mes}/${ano}`;
}

/**
 * Converte string de data e hora para objeto Date em horário local.
 * Aceita formatos: 'YYYY-MM-DD HH:mm' ou 'DD/MM/YYYY HH:mm'
 */
export function parseDataHoraLocal(str) {
  if (!str.includes(' ')) {
    throw new Error(
      'Formato de data inválido: deve conter espaço entre data e hora',
    );
  }

  const [data, hora] = str.trim().split(' ');
  const isBR = data.includes('/');

  let dia, mes, ano;

  if (isBR) {
    [dia, mes, ano] = data.split('/').map(Number);
  } else {
    [ano, mes, dia] = data.split('-').map(Number);
  }

  const [h, m, s = '00'] = hora.split(':').map(Number);

  let dataLocal = new Date(ano, mes - 1, dia, h, m, parseInt(s));

  // Detecta bug de UTC silencioso (ex: Dify)
  const horaEsperada = h;
  const horaInterpretada = dataLocal.getHours();

  console.log('Horas esperadas:', horaEsperada);
  console.log('Hora interpretada: ', horaInterpretada);
  console.log('Data local:', dataLocal.getHours());

  return dataLocal;
}
