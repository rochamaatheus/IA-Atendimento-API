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

router.post('/atualizar-usuario', async (req, res) => {
  if (!checkApiKey(req, res)) return;

  try {
    const { telefone, nome, cpf } = req.body;
    if (!telefone) {
      return res.status(400).json({ erro: 'Telefone é obrigatório' });
    }

    const telefoneNormalizado = normalizarTelefone(telefone);
    const cpfFormatado = normalizarCPF(cpf || '');

    const auth = getAuthClient();
    const sheets = getSheetsClient(auth);
    const valores = await buscarDadosPlanilha(sheets, spreadsheetId, range);

    const header = valores[0];
    const linhas = valores.slice(1);

    const colCPF = header.indexOf('CPF');
    const colNome = header.indexOf('Nome');
    const colTelefone = header.indexOf('Telefone');

    if (colCPF === -1 || colNome === -1 || colTelefone === -1) {
      return res.status(500).json({ erro: 'Cabeçalhos da planilha inválidos' });
    }

    const linhaIndex = linhas.findIndex(linha => {
      const telPlanilha = normalizarTelefone(linha[colTelefone] || '');
      return telPlanilha === telefoneNormalizado;
    });

    if (linhaIndex === -1) {
      return res.status(404).json({ erro: 'Usuário não encontrado' });
    }

    const novaLinha = [...linhas[linhaIndex]];

    while (novaLinha.length <= Math.max(colCPF, colNome) + 1) {
      novaLinha.push('');
    }

    novaLinha[colCPF] = cpfFormatado;
    novaLinha[colNome] = nome;
    novaLinha[colTelefone] = `'${telefoneNormalizado}`;

    const rangeLinha = `Página1!A${linhaIndex + 2}:Z${linhaIndex + 2}`;
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: rangeLinha,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [novaLinha] },
    });

    res.status(200).json({
      mensagem: 'Usuário atualizado com sucesso',
      atualizado: { cpf: cpfFormatado, nome, telefone: telefoneNormalizado },
    });
  } catch (err) {
    console.error('[ERRO] /atualizar-usuario:', err.message);
    res.status(500).json({ erro: 'Erro ao atualizar usuário na planilha' });
  }
});

export default router;
