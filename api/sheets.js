import express from 'express';
import { google } from 'googleapis';
import { getAuthClient } from '../lib/googleAuth.js';

const router = express.Router();

router.get('/planilha', async (req, res) => {
  const auth = getAuthClient();
  const sheets = google.sheets({ version: 'v4', auth });

  const spreadsheetsId = 'ID_DA_PLANILHA'; // substituir
  const range = 'Página1!A!:B10';

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });

  res.json(response.data.values);
});

export default router;
