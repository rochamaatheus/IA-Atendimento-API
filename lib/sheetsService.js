// lib/sheetsService.js

import { google } from 'googleapis';
import { normalizarCPF, normalizarTelefone } from './sheetsUtils.js';

/**
 * Retorna um cliente de Sheets autenticado
 */
export function getSheetsClient(auth) {
  return google.sheets({ version: 'v4', auth });
}

/**
 * Busca todos os dados da planilha
 */
export async function buscarDadosPlanilha(sheets, spreadsheetId, range) {
  const { data } = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });
  return data.values || [];
}

/**
 * Procura usuário por telefone e retorna { usuario, index } ou null
 */
export function encontrarUsuarioPorTelefone(valores, telefone) {
  const telefoneNormalizado = normalizarTelefone(telefone);
  const index = valores.findIndex((linha, i) => {
    if (i === 0) return false; // pula cabeçalho
    return normalizarTelefone(linha[2] || '') === telefoneNormalizado;
  });

  if (index === -1) return null;

  return {
    usuario: valores[index],
    index,
  };
}

/**
 * Insere nova linha na planilha
 */
export async function adicionarLinha(sheets, spreadsheetId, linha) {
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: 'Página1!A:E',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [linha],
    },
  });
}

/**
 * Atualiza a data da próxima consulta de um lead já existente
 */
export async function atualizarConsultaNaPlanilha(
  sheets,
  spreadsheetId,
  telefone,
  novaData,
  valores,
) {
  const header = valores[0];
  const linhas = valores.slice(1);

  const colTelefone = header.indexOf('Telefone');
  const colProximaConsulta = header.indexOf('Próxima Consulta');
  const colUltimaConsulta = header.indexOf('Última Consulta');

  if (
    colTelefone === -1 ||
    colProximaConsulta === -1 ||
    colUltimaConsulta === -1
  ) {
    console.error('[ERRO] Cabeçalhos não encontrados!');
    return false;
  }

  const linhaIndex = linhas.findIndex(linha => {
    const tel = normalizarTelefone(linha[colTelefone] || '');
    const telReq = normalizarTelefone(telefone);
    return tel === telReq;
  });

  if (linhaIndex === -1) return false;

  const linhaPlanilha = linhas[linhaIndex];
  const rangeLinha = `Página1!A${linhaIndex + 2}:Z${linhaIndex + 2}`;
  const novaLinha = [...linhaPlanilha];

  // Garante espaço suficiente
  while (
    novaLinha.length <
    Math.max(colTelefone, colProximaConsulta, colUltimaConsulta) + 1
  ) {
    novaLinha.push('');
  }

  // Apóstrofo no telefone pra não virar fórmula
  novaLinha[colTelefone] = `'${normalizarTelefone(telefone)}`;

  // Salva próxima consulta atual (se tiver)
  const valorAtualProxima = novaLinha[colProximaConsulta];

  // Move pra "última consulta" se já tiver data antiga
  if (valorAtualProxima && valorAtualProxima !== novaData) {
    novaLinha[colUltimaConsulta] = valorAtualProxima;
  }

  // Atualiza a nova data na "próxima consulta"
  novaLinha[colProximaConsulta] = novaData;

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: rangeLinha,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [novaLinha],
    },
  });

  return true;
}

/**
 * Adiciona uma nova linha para um lead com data de agendamento
 */
export async function adicionarNovaLinhaLead(
  sheets,
  spreadsheetId,
  { cpf, nome, telefone, dataConsulta },
) {
  const novaLinha = [
    normalizarCPF(cpf),
    nome,
    `'${normalizarTelefone(telefone)}`,
    '',
    dataConsulta,
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: 'Página1!A:E',
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [novaLinha] },
  });
}
