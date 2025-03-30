// lib/middlewares.js
export function parseBodyMiddleware(req, res, next) {
  console.log('[DEBUG] Body recebido:', req.body);
  if (typeof req.body === 'string') {
    try {
      req.body = JSON.parse(req.body);
    } catch {
      return res.status(400).json({ erro: 'Corpo inválido. Deve ser JSON.' });
    }
  }
  next();
}
