// lib/googleAuth.js
import { google } from 'googleapis';

export function getAuthClient() {
  const credentialsBase64 = process.env.GOOGLE_PRIVATE_KEY_BASE64;

  if (!credentialsBase64) {
    throw new Error('GOOGLE_PRIVATE_KEY_BASE64 não está definido no .env');
  }

  const serviceAccount = JSON.parse(
    Buffer.from(credentialsBase64, 'base64').toString('utf-8'),
  );

  const formattedKey = serviceAccount.private_key.replace(/\\n/g, '\n');

  return new google.auth.JWT({
    email: serviceAccount.client_email,
    key: formattedKey,
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/calendar',
    ],
  });
}
