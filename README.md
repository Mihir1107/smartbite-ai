# SmartBite AI

**AI-Powered Revenue & Voice Copilot for Restaurants**

SmartBite is an intelligent restaurant management platform that combines voice ordering, AI-driven revenue analytics, and a smart menu recommendation engine to help restaurants increase revenue and streamline operations.

---

## Features

### Customer Side (`/user`)
- **Menu Browsing & Cart** — Full digital menu with search, category filters, and modifier support
- **AI Chat Assistant** — Natural language ordering via text chat (powered by GPT-4o-mini)
- **Voice Call Assistant** — Hands-free phone-style ordering with TTS responses, auto-listen, and Hindi/Hinglish support
- **Smart Menu Recommender** — Context-aware item suggestions ("You might also like", "Frequently ordered together") based on cart contents
- **Live Order Tracking** — Real-time order status updates with KOT generation

### Owner Side (`/owner`)
- **Dashboard** — Revenue summary, order metrics, top items, and live order feed
- **AI Revenue Engine** (`/owner/revenue-engine`) — BCG-style quadrant analysis (Stars/Cash Cows/Puzzles/Dogs) with AI-powered optimization recommendations and one-click actions (raise price, add combo, run promo)
- **Live Orders** (`/orders`) — Real-time order management with status workflow

### AI & Voice
- **OpenAI GPT-4o-mini** — Intent classification for call assistant (add items, modify, confirm, decline)
- **OpenAI Whisper** — Speech-to-text with Hindi language support
- **Browser SpeechRecognition** — Client-side voice capture (`en-IN`)
- **Browser SpeechSynthesis** — Text-to-speech for call assistant responses
- **Frontend Recommender Engine** — Pure client-side recommendation system with 50+ item pairings, category completion rules, and meal stage logic

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 (Turbopack), React 19, Tailwind CSS, Radix UI, Framer Motion |
| Backend | FastAPI (Python), Uvicorn |
| Database | SQLite (local), MongoDB (optional auth) |
| AI/ML | OpenAI GPT-4o-mini, Whisper, spaCy, RapidFuzz |
| Voice | Web Speech API (SpeechRecognition + SpeechSynthesis) |

---

## Project Structure

```
smartbite/
├── backend/                          # FastAPI backend
│   ├── main.py                       # All API endpoints (~1800 lines)
│   ├── auth.py                       # JWT authentication utilities
│   ├── database.py                   # MongoDB connection config
│   ├── voice_pipeline.py             # Voice order processing pipeline
│   ├── create_users.py               # User seeding script
│   ├── generate_synthetic_data.py    # Menu & order data generator
│   └── requirements.txt              # Python dependencies
│
├── petpooja-ui-framework/            # Next.js frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx              # Landing page
│   │   │   ├── layout.tsx            # Root layout
│   │   │   ├── globals.css           # Global styles
│   │   │   ├── login/page.tsx        # Login page
│   │   │   ├── user/page.tsx         # Customer page (menu, cart, chat, call)
│   │   │   ├── owner/
│   │   │   │   ├── page.tsx          # Owner dashboard
│   │   │   │   └── revenue-engine/page.tsx  # AI revenue analytics
│   │   │   ├── orders/page.tsx       # Live order management
│   │   │   └── call-assistant/page.tsx      # Standalone call assistant
│   │   ├── components/
│   │   │   ├── shared.tsx            # Navigation, footer, shared UI
│   │   │   ├── VoiceCallAssistant.tsx
│   │   │   ├── AIChat.tsx
│   │   │   ├── MenuOrderPanel.tsx
│   │   │   └── ui/                   # Radix UI component library
│   │   ├── lib/
│   │   │   ├── api.ts                # API base URL & fetch helpers
│   │   │   ├── recommender.ts        # Smart menu recommender engine
│   │   │   ├── types.ts              # TypeScript type definitions
│   │   │   ├── time.ts               # Timestamp formatting
│   │   │   └── utils.ts              # Utility functions
│   │   └── hooks/
│   │       └── use-mobile.ts         # Mobile detection hook
│   ├── package.json
│   └── next.config.ts
│
├── .gitignore
└── README.md
```

---

## Getting Started

### Prerequisites

- Python 3.10+
- Node.js 18+
- OpenAI API key (for voice & AI features)

### 1. Backend Setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Create `backend/.env`:

```env
OPENAI_API_KEY=sk-...
```

Seed the database:

```bash
python generate_synthetic_data.py
```

Start the backend:

```bash
uvicorn main:app --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000` (Swagger docs at `/docs`).

### 2. Frontend Setup

```bash
cd petpooja-ui-framework
npm install
npm run dev -- --port 3000
```

The app will be available at `http://localhost:3000`.

---

## Environment Variables

| Variable | Where | Description |
|----------|-------|-------------|
| `OPENAI_API_KEY` | Backend `.env` | OpenAI API key for GPT-4o-mini and Whisper |
| `NEXT_PUBLIC_API_URL` | Frontend env | Backend URL (defaults to `http://localhost:8000`) |
| `SECRET_KEY` | Backend `.env` | JWT signing secret (has a default for dev) |
| `MONGODB_URL` | Backend `.env` | MongoDB URI (defaults to `localhost:27017`) |

---

## Deployment

- **Frontend** → Vercel (set `NEXT_PUBLIC_API_URL` to your deployed backend URL)
- **Backend** → Render / Railway / Fly.io (set `OPENAI_API_KEY` as environment variable)

The OpenAI API key is only used server-side in the backend — it never reaches the frontend.

---

## API Endpoints (Key)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/menu/items` | List all menu items |
| GET | `/api/dashboard/summary` | Dashboard metrics |
| GET | `/api/menu/analytics` | Revenue analytics per item |
| GET | `/api/menu/ai-recommendations` | AI optimization recommendations |
| POST | `/api/menu/{id}/action` | Apply AI action (raise price, combo, promo) |
| POST | `/api/voice/smart-turn` | Call assistant intent classification |
| POST | `/api/voice/demo` | Parse voice transcript to order |
| POST | `/api/cart/recommendations` | Get upsell suggestions for cart |
| POST | `/api/orders` | Place a new order |
| PATCH | `/api/orders/{id}/status` | Update order status |
| GET | `/api/orders/{id}/kot` | Generate KOT for order |

---

## License

Built for the Nirma Hackathon.
