import express from 'express';
import { google } from 'googleapis';
import { getAuthClient } from '../lib/googleAuth.js';
import { checkApiKey } from '../lib/verifyAuth.js';
import { normalizarTelefone } from '../lib/sheetsUtils.js';

const router = express.Router();

router.post('/usuario', async (req, res) => {
  if (!checkApiKey(req, res)) return;

  try {
    const telefoneBruto = req.body.telefone;
    if (!telefoneBruto) {
      return res.status(400).json({ erro: 'Telefone é obrigatório' });
    }

    const telefoneNormalizado = normalizarTelefone(telefoneBruto);

    const auth = getAuthClient();
    const sheets = google.sheets({ version: 'v4', auth });

    const spreadsheetId = '1Ib3yOXjDEQLmUyzhrXPjPUhxqyy6CNHwncIC81i70GE';
    const range = 'Página1!A1:E';

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const valores = response.data.values;
    const cabecalho = valores[0];
    const colunaTelefoneIndex = cabecalho.findIndex(
      t => t.toLowerCase() === 'telefone',
    );

    if (colunaTelefoneIndex === -1) {
      return res.status(500).json({ erro: 'Coluna Telefone não encontrada' });
    }

    const usuario = valores.slice(1).find(linha => {
      const telDaLinha = normalizarTelefone(linha[colunaTelefoneIndex] || '');
      return telDaLinha === telefoneNormalizado;
    });

    if (!usuario) {
      return res.status(404).json({ erro: 'Usuário não encontrado' });
    }

    const dados = {};
    cabecalho.forEach((coluna, i) => {
      dados[coluna] = usuario[i] || '';
    });

    return res.json({ usuario: dados });
  } catch (err) {
    console.error('[ERRO] /usuario:', err.message);
    res.status(500).json({ erro: 'Erro ao buscar usuário' });
  }
});

export default router;
