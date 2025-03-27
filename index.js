import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import calendarRoutes from './api/calendar.js';
import sheetsRoutes from './api/sheets.js';

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use('/api', calendarRoutes);
app.use('/api', sheetsRoutes);

app.get('/', (req, res) => res.send('🔥 API do Rocha rodando liso 🔥'));

app.listen(port, () => console.log(`Server rodando na porta ${port}`));
