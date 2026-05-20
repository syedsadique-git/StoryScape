# 📖 StoryScape — AI-Powered Immersive Story Platform

StoryScape is a full-stack web application that transforms written stories into cinematic, multi-sensory reading experiences using AI. Upload a story and the platform automatically generates a cover, background art, ambient music, and AI voice narration — all powered by Google Gemini and Hugging Face.

---

## ✨ Features

- **AI Story Analysis** — Google Gemini 2.5 Flash analyzes plot, themes, mood, and characters
- **AI Cover Art** — FLUX.1-schnell / Stable Diffusion XL generates unique book covers
- **AI Background Art** — Atmospheric scene art matching the story's setting
- **AI Ambient Music** — Meta MusicGen composes a looping soundtrack per genre
- **AI Voice Narration** — Multiple TTS voices (LJSpeech VITS, Bark, Coqui XTTS, MMS-TTS)
- **Immersive Reader** — Chapter navigation, paragraph-level narration, dark/light theme
- **Auth System** — Email OTP verification, JWT sessions, Google OAuth
- **Personal Library** — Bookmark stories and track reading progress

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite, Tailwind CSS, Framer Motion |
| Backend | Node.js, Express, better-sqlite3 |
| Auth | JWT, bcryptjs, Passport.js (Google OAuth) |
| AI Models | Google Gemini 2.5 Flash, FLUX.1, SDXL, MusicGen, Bark |
| AI Infra | Hugging Face Inference API, Google AI Studio |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm 9+

### 1. Clone the repository
```bash
git clone https://github.com/syedsadique-git/StoryScape.git
cd StoryScape
```

### 2. Install all dependencies
```bash
npm run install-all
```

### 3. Configure environment variables
```bash
cp .env.example .env
```

Open `.env` and fill in your API keys (see table below).

### 4. Start development server
```bash
npm run dev
```

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000

---

## 🔑 Required API Keys

| Variable | Where to Get | Required |
|----------|-------------|----------|
| `GEMINI_API_KEY` | [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) | ✅ Yes |
| `HF_API_TOKEN` | [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens) | ✅ Yes |
| `JWT_SECRET` | Any long random string | ✅ Yes |
| `GOOGLE_CLIENT_ID` | [console.cloud.google.com](https://console.cloud.google.com) → OAuth 2.0 | Optional |
| `GOOGLE_CLIENT_SECRET` | Same as above | Optional |
| `SMTP_USER` | Your Gmail address | Optional |
| `SMTP_PASS` | Gmail App Password | Optional |

> **Note:** Email (SMTP) and Google OAuth are optional. In development mode, OTP codes are printed to the server console instead of being emailed.

---

## 📁 Project Structure

```
StoryScape/
├── client/                  # React frontend (Vite)
│   └── src/
│       ├── api/             # Axios API layer
│       ├── components/      # Reusable UI components
│       ├── context/         # Auth context (React Context)
│       └── pages/           # Route pages (Home, Reader, Explore…)
├── server/                  # Express backend
│   ├── pipeline/            # AI generation pipeline
│   │   ├── analyze.js       # Gemini story analysis
│   │   ├── cover.js         # FLUX/SDXL cover generation
│   │   ├── background.js    # SDXL background generation
│   │   ├── music.js         # MusicGen soundtrack
│   │   ├── tts.js           # Text-to-Speech narration
│   │   └── runner.js        # Orchestrates pipeline stages
│   ├── routes/              # Express routers
│   ├── middleware/          # JWT auth middleware
│   └── db.js                # SQLite schema & seed data
├── .env.example             # Environment variable template
└── package.json             # Root scripts (dev, install-all)
```

---

## 📜 License

MIT
