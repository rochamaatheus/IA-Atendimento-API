export function checkApiKey(req, res) {
  const token = req.headers['x-api-key'];
  if (!token || token !== process.env.SECRET_TOKEN) {
    res.status(401).json({ erro: 'Token inválido ou ausente' });
    return false;
  }
  return true;
}
