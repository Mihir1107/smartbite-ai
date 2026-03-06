# SmartBite AI

SmartBite AI is a restaurant intelligence platform with voice ordering, revenue analytics, and AI-assisted customer workflows.

## Directory Structure

```text
smartbite/
├── backend/                        # FastAPI API + data/AI pipeline
│   ├── main.py
│   ├── voice_pipeline.py
│   ├── auth.py
│   ├── database.py
│   ├── create_users.py
│   ├── generate_synthetic_data.py
│   └── requirements.txt
├── frontend/                       # Vite + React client
│   ├── src/
│   ├── public/
│   ├── scripts/                    # one-off maintenance utilities
│   │   ├── fix_divs.js
│   │   └── fix_jsx.js
│   └── package.json
├── petpooja-ui-framework/          # Next.js UI framework workspace
│   ├── src/
│   └── package.json
└── README.md
```

## Backend Setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Optional `.env` in `backend/`:

```env
OPENAI_API_KEY=sk-...
```

Run backend:

```bash
cd backend
source .venv/bin/activate
uvicorn main:app --reload --port 8000
```

Backend URLs:

- API: `http://localhost:8000`
- Swagger: `http://localhost:8000/docs`

## Frontend Setup (Vite)

```bash
cd frontend
npm install
npm run dev
```

Vite app URL: `http://localhost:5173`

## Frontend Setup (Next.js)

```bash
cd petpooja-ui-framework
npm install
npm run dev
```

Next app URL: `http://localhost:3000`
