# 📅 API-SECRETARIA · Automação de Agendamento e CRM com Google Workspace

API completa e escalável para automação de **agendamentos, calendários e gestão de clientes**, utilizando os serviços do **Google Workspace** (Calendar + Sheets). Desenvolvida com foco em performance, segurança e modularidade, essa API centraliza a lógica de agendamento e serve como base para sistemas de CRM e controle de atendimentos.

> 🚧 **Projeto em expansão!** A primeira rota (`/api/disponibilidade`) já está 100% funcional, mas muitas features ainda estão por vir. Veja abaixo o que já foi feito e o que tá no forno. 👇

---

## ✅ Funcionalidades já implementadas

### 🔹 Rota: `POST /api/disponibilidade`

Endpoint que retorna os **horários livres para agendamento** dentro de um período, respeitando:

- ⏰ Horários ocupados no Google Calendar (consulta via `freebusy`)
- ❌ Vetos manuais enviados via body (dias e horários específicos)
- 📅 Dias úteis (segunda a sexta)
- ⛓️ Intervalos de atendimento fixos (ex: a cada 60min)
- 🌎 Conversão automática de UTC para `America/Sao_Paulo`
- 📂 Agrupamento dos horários disponíveis por data

#### 📥 Exemplo de body:

```json
{
  "agendar_apartir_de": "2025-03-10T00:00:00.000Z",
  "agendar_ateh": "2025-03-20T00:00:00.000Z",
  "diasVetados": ["2025-03-15", "2025-03-17"],
  "horariosVetados": ["12:00", "15:00"]
}
```

#### 📤 Exemplo de resposta:

```json
{
  "horariosDisponiveis": {
    "2025-03-10": ["09:00", "10:00", "11:00"],
    "2025-03-11": ["09:00", "13:00", "16:00"]
  }
}
```

---

## 🧠 Visão geral do projeto

Essa API **é** a base de uma plataforma inteligente de gerenciamento de atendimentos e clientes, focada em automatizar tarefas operacionais como:

- ✅ Verificação de disponibilidade
- 📆 Criação e cancelamento de eventos no Google Calendar
- 📋 Leitura e escrita de dados no Google Sheets (CRM)
- 🔐 Controle de autenticação e autorização de secretárias e atendentes
- 📊 Dashboards integrados com status e relatórios

Tudo isso usando uma estrutura flexível, com módulos desacoplados e foco em manutenção a longo prazo.

---

## 🧱 Tecnologias utilizadas

| Stack                 | Descrição                             |
| --------------------- | ------------------------------------- |
| Node.js               | Ambiente principal da API             |
| Express               | Framework HTTP                        |
| Luxon                 | Manipulação de datas e fusos horários |
| Google Calendar API   | Consulta e gerenciamento de eventos   |
| Google Sheets API     | Integração futura para CRM            |
| JWT (Service Account) | Autenticação com Google Workspace     |
| Vercel                | Deploy simples e escalável            |

---

## 📦 Estrutura inicial do projeto

```
.
├── api/
│   ├── calendar.js       # Lógica de disponibilidade
│   └── sheets.js         # Integração com CRM
├── lib/
│   └── googleAuth.js     # Autenticação via Service Account
├── vercel.json           # Configurações de deploy
├── index.js              # Server principal
```

---

## 🔐 Segurança e boas práticas

- ✅ Variáveis sensíveis isoladas no `.env`
- ✅ `.gitignore` configurado para proteger credenciais
- ✅ Modularização de serviços
- ✅ Preparado para deploy em produção

---

## 🧪 Próximas funcionalidades

| Status          | Feature                                                  |
| --------------- | -------------------------------------------------------- |
| 🔄 Em progresso | Retornar também os horários ocupados no dia              |
| 🔜 Planejado    | Personalizar horário de atendimento e intervalo via body |
| 🔜 Planejado    | Criação de eventos no Google Calendar                    |
| 🔜 Planejado    | Integração completa com Google Sheets para CRM           |
| 🔜 Planejado    | Modo verbose para debug (logs no response)               |
| 🔜 Planejado    | Middleware de autenticação e proteção de rotas           |
| 🔜 Planejado    | Deploy com rate limit e CORS inteligente                 |

---

## 👨‍💻 Autor

**Matheus Silveira Rocha**  
Desenvolvedor focado em automações, back-end e integração de sistemas.  
Apaixonado por código limpo, performático e pronto pra produção.

[🔗 LinkedIn](https://www.linkedin.com/in/matheus-rocha-269870234/)  
[💻 GitHub](https://github.com/rochamaatheus)

---
