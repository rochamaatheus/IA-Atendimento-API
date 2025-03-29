const cache = new Map();

/**
 * Gera chave única com base nos parâmetros do calendar.
 */
function gerarChave(calendarId, start, end) {
  return `${calendarId}-${start.toISOString()}-${end.toISOString()}`;
}

/**
 * Consulta o cache, se existir e não estiver expirado.
 */
export function getFromCache(calendarId, start, end) {
  const chave = gerarChave(calendarId, start, end);
  const item = cache.get(chave);

  if (item && Date.now() < item.expira) {
    return item.data;
  }

  return null;
}

/**
 * Salva um valor no cache por um tempo (padrão: 3 min).
 */
export function setCache(calendarId, start, end, data, ttlMs = 1000 * 60 * 3) {
  const chave = gerarChave(calendarId, start, end);
  cache.set(chave, {
    data,
    expira: Date.now() + ttlMs,
  });
}

/**
 * Limpa qualquer cache que intersecta o intervalo fornecido
 * Ex: reserva de 10/03 a 15/03 → apaga qualquer chave que envolva datas desse intervalo
 */
export function clearAllCacheForRange(calendarId, rangeStart, rangeEnd) {
  for (const [chave, _] of cache.entries()) {
    if (chave.startsWith(calendarId)) {
      const [, rawStart, rawEnd] = chave.split('-');

      const startDate = new Date(rawStart);
      const endDate = new Date(rawEnd);

      const intersecta = rangeStart <= endDate && rangeEnd >= startDate;

      if (intersecta) {
        cache.delete(chave);
        console.log(`[CACHE] Limpando chave: ${chave}`);
      }
    }
  }
}
