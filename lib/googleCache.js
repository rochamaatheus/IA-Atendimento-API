// lib/googleCache.js

let cache = []; // Cache inteligente como lista de objetos

/**
 * Salva resultado em cache com TTL (default: 3 minutos)
 */
export function setCache(calendarId, start, end, data, ttlMs = 1000 * 60 * 3) {
  cache.push({ calendarId, start, end, data, expira: Date.now() + ttlMs });
}

/**
 * Consulta cache: retorna dado se existir range que envolve totalmente o solicitado
 */
export function getFromCache(calendarId, start, end) {
  start = new Date(start);
  end = new Date(end);

  const item = cache.find(
    c =>
      c.calendarId === calendarId &&
      start >= c.start &&
      end <= c.end &&
      Date.now() < c.expira,
  );

  if (!item) return null;

  // Se o cache cobre o range, mas o range é menor → filtrar os busySlots
  const busySlotsFiltrados = item.data.filter(
    slot => slot.start >= start && slot.end <= end,
  );

  return busySlotsFiltrados;
}

/**
 * Limpa TODO o cache (modo bruto, pra testes/debug/reset geral)
 */
export function resetCache() {
  cache = [];
}

/**
 * Ver o estado do cache no console (debug)
 */
export function logCache() {
  console.log(
    '[CACHE] Estado atual:',
    cache.map(c => ({
      calendarId: c.calendarId,
      start: c.start.toISOString(),
      end: c.end.toISOString(),
      expiraEm: new Date(c.expira).toISOString(),
    })),
  );
}
