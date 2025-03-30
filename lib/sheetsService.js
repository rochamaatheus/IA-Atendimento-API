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
  dataFormatada,
  valores,
) {
  const index = valores.findIndex(
    l => l[2] && normalizarTelefone(l[2]) === normalizarTelefone(telefone),
  );

  if (index === -1) return false;

  const linhaIndex = index + 1;

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `Página1!E${linhaIndex}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [[dataFormatada]] },
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
