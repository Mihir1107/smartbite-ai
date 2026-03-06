# SmartBite Local Development

This repo runs as two local services:
- Frontend: Vite + React at `http://localhost:5173`
- Backend: FastAPI at `http://localhost:8000`

## One-Time Setup

### 1. Frontend deps
```bash
cd "/Users/mihirmandavia/nirma hackathon"
npm install
```

### 2. Backend venv + deps
```bash
cd "/Users/mihirmandavia/nirma hackathon/smartbite"
/opt/homebrew/bin/python3.13 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
python -m spacy download en_core_web_sm
```

## Start Development

Open two terminals.

### Terminal A: backend
```bash
cd "/Users/mihirmandavia/nirma hackathon"
npm run dev:backend
```

### Terminal B: frontend
```bash
cd "/Users/mihirmandavia/nirma hackathon"
npm run dev:frontend
```

## Useful URLs
- Frontend app: `http://localhost:5173`
- Backend health: `http://localhost:8000/`
- Backend docs: `http://localhost:8000/docs`

## Optional env vars (for real integrations)
```bash
export OPENAI_API_KEY=sk-...
export TWILIO_ACCOUNT_SID=AC...
export TWILIO_AUTH_TOKEN=...
```

The app works in demo/mock mode even without these keys.

## Troubleshooting
- If backend install fails on Python 3.14, use Python 3.13 for the virtualenv.
- If port `5173` or `8000` is busy, stop old dev processes and restart.
