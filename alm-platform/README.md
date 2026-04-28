# ALM Event Platform

AI-powered event and budget management platform for student organizations.

## Features

- **Event management** — create events with AI-generated planning checklists
- **Budget requests** — submit itemized budget requests tied to events
- **Approval workflow** — finance officers approve/reject with full audit trail
- **AI anomaly detection** — flags unusually large budget requests automatically
- **Role-based access** — VP of Events, Finance Officer, Admin
- **Real-time balance** — org budget updates instantly on approval

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, Recharts |
| Backend | FastAPI, Python 3.11+ |
| Database + Auth | Supabase (PostgreSQL) |
| AI | Anthropic Claude API (claude-sonnet-4-20250514) |

## Setup

### 1. Supabase

1. Create a free project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and paste the contents of `supabase/schema.sql`
3. Run it — this creates all tables and seeds the default budget

### 2. API Keys

Get your keys:
- **Supabase**: Project Settings → API → `anon` key + `service_role` key + Project URL
- **Anthropic**: [console.anthropic.com](https://console.anthropic.com) → API Keys

### 3. Backend

```bash
cd backend
cp .env.example .env
# Fill in your keys in .env

pip install -r requirements.txt
uvicorn main:app --reload
```

Backend runs at `http://localhost:8000`
API docs at `http://localhost:8000/docs`

### 4. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`

## Project Structure

```
alm-platform/
├── backend/
│   ├── routes/
│   │   ├── auth.py         # JWT login/register
│   │   ├── events.py       # Event CRUD + AI checklist
│   │   ├── budget.py       # Budget requests + approval workflow
│   │   └── ai_service.py   # Claude API integration
│   ├── models/schemas.py   # Pydantic models
│   ├── middleware/audit_log.py
│   ├── database.py
│   └── main.py
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── Login.jsx
│       │   ├── EventDashboard.jsx
│       │   ├── BudgetRequest.jsx
│       │   └── FinancePortal.jsx
│       └── components/
│           ├── Navbar.jsx
│           └── EventCard.jsx
├── supabase/schema.sql
└── README.md
```

## Resume Talking Points

- "Built a full-stack AI event management platform with role-based access control used by a 100+ member student organization"
- "Integrated Claude API for automated event planning checklist generation and budget anomaly detection"
- "Implemented a multi-role budget approval workflow with real-time balance tracking and immutable audit logging"
- "Deployed backend on Railway with FastAPI + Supabase PostgreSQL; frontend on Vercel"
