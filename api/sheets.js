import express from 'express';
import { getAuthClient } from '../lib/googleAuth.js';
import { checkApiKey } from '../lib/verifyAuth.js';
import { normalizarTelefone, normalizarCPF } from '../lib/sheetsUtils.js';
import {
  getSheetsClient,
  buscarDadosPlanilha,
  encontrarUsuarioPorTelefone,
  adicionarLinha,
} from '../lib/sheetsService.js';

const router = express.Router();
const spreadsheetId = '1Ib3yOXjDEQLmUyzhrXPjPUhxqyy6CNHwncIC81i70GE';
const range = 'Página1!A1:E';

router.post('/usuario', async (req, res) => {
  if (!checkApiKey(req, res)) return;

  try {
    const telefone = req.body.telefone;
    if (!telefone) {
      return res.status(400).json({ erro: 'Telefone é obrigatório' });
    }

    const auth = getAuthClient();
    const sheets = getSheetsClient(auth);

    const valores = await buscarDadosPlanilha(sheets, spreadsheetId, range);
    const cabecalho = valores[0];
    const resultado = encontrarUsuarioPorTelefone(valores, telefone);

    if (!resultado) {
      return res.status(404).json({ erro: 'Usuário não encontrado' });
    }

    const { usuario } = resultado;

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

router.post('/registrar-lead', async (req, res) => {
  if (!checkApiKey(req, res)) return;

  try {
    const { cpf = '', nome = '', telefone } = req.body;
    if (!telefone) {
      return res.status(400).json({ erro: 'Telefone é obrigatório' });
    }

    const telefoneNormalizado = normalizarTelefone(telefone);
    const cpfFormatado = normalizarCPF(cpf);

    const auth = getAuthClient();
    const sheets = getSheetsClient(auth);
    const valores = await buscarDadosPlanilha(sheets, spreadsheetId, range);
    const resultado = encontrarUsuarioPorTelefone(valores, telefone);

    if (resultado) {
      return res
        .status(409)
        .json({ erro: 'Telefone já cadastrado na planilha' });
    }

    const novaLinha = [cpfFormatado, nome, `'${telefoneNormalizado}`, '', ''];

    await adicionarLinha(sheets, spreadsheetId, novaLinha);

    res.status(201).json({
      mensagem: 'Lead registrado com sucesso',
      lead: { cpfFormatado, nome, telefone: telefoneNormalizado },
    });
  } catch (err) {
    console.error('[ERRO] /registrar-lead:', err.message);
    res.status(500).json({ erro: 'Erro ao registrar lead na planilha' });
  }
});

export default router;
