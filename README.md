# SmartBite AI

SmartBite AI is an AI-powered restaurant management system featuring live voice ordering, intelligent price optimization, and real-time dashboard analytics.

## Project Structure
```text
smartbite/
├── backend/               ← FastAPI Server & AI Pipelines
│   ├── main.py
│   ├── voice_pipeline.py
│   └── requirements.txt
├── frontend/              ← React + Vite UI
│   ├── src/App.jsx
│   └── package.json
└── archive/               ← Stale component backups
```

---

## ⚡ 1. Backend Setup

The backend powers the KPI analytics, the SQLite orders database, and the OpenAI Whisper microphone pipeline.

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m spacy download en_core_web_sm
```

### Environment Variables
Optionally create a `backend/.env` file to enable the real AI transcription. Without it, the voice demo falls back to mock text.
```env
OPENAI_API_KEY=sk-...
```

### Run the Server
```bash
cd backend
source .venv/bin/activate
uvicorn main:app --reload --port 8000
```
- API Health/Base: `http://localhost:8000`
- API Docs (Swagger): `http://localhost:8000/docs`

---

## ⚡ 2. Frontend Setup

The frontend is a modern Vite + React application providing the dashboard interface.

```bash
cd frontend
npm install
```

### Run the UI
```bash
cd frontend
npm run dev
```
- Web Application: `http://localhost:5173`

---

## 🏆 Key Features

1. **AI Price Optimization:** Generates reasoning-backed price hikes or bundle combos for struggling menu items (Dogs and Puzzles) based on margins and historical unit sales.
2. **Live Voice Ordering:** Processes real Hinglish microphone audio via the OpenAI Whisper API instantly routing structured items to the cart and DB.
3. **Ghost Call Recovery:** Identifies missed phone calls during peak hours to trigger one-click WhatsApp recovery messages.
4. **Real-time Engine:** The dashboard natively loops voice orders back into the sales pipeline dynamically.
