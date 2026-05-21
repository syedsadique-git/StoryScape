# 📖 StoryScape — AI-Powered Immersive Story Platform

StoryScape is a full-stack web application that transforms written stories into cinematic, multi-sensory reading experiences using AI. Upload a story and the platform automatically generates a cover, background art, ambient music, and AI voice narration — all powered by Google Gemini and Hugging Face.

---

## ✨ Features

- **AI Story Analysis** — Google Gemini 2.5 Flash analyzes plot, themes, mood, setting and characters
- **AI Cover Art** — FLUX.1-schnell generates a unique book cover for every story
- **AI Background Art** — Atmospheric scene art matching the story's setting and mood
- **Ambient Soundtrack** — Per-story music placeholder (full music generation via Suno/Udio coming soon)
- **AI Voice Narration** — Paragraph-by-paragraph narration using the browser's built-in Web Speech API
- **Immersive Reader** — Chapter navigation, dark/light theme, font-size controls, fullscreen mode
- **Auth System** — Email OTP verification, JWT sessions, Google OAuth
- **Personal Library** — Bookmark stories and track chapter-level reading progress
- **Explore & Genres** — Browse all stories or filter by genre

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite, Tailwind CSS |
| Backend | Node.js, Express, better-sqlite3 (SQLite) |
| Auth | JWT, bcryptjs, Passport.js (Google OAuth) |
| AI Analysis | Google Gemini 2.5 Flash |
| AI Images | Hugging Face Inference API (FLUX.1-schnell) |
| TTS | Browser Web Speech API (zero-latency, no API quota) |

---

## Screenshots

<img width="1469" height="717" alt="Screenshot 2026-05-21 at 8 14 24 PM" src="https://github.com/user-attachments/assets/60fafd69-0940-4b29-9587-32f4b5105d54" />
<img width="1468" height="758" alt="Screenshot 2026-05-21 at 8 14 45 PM" src="https://github.com/user-attachments/assets/e838c3a3-66a2-450d-bc39-754a9c948061" />
<img width="1468" height="759" alt="Screenshot 2026-05-21 at 8 15 05 PM" src="https://github.com/user-attachments/assets/e6419208-32ee-4f48-9a64-f7a9d6511f63" />
<img width="1462" height="744" alt="Screenshot 2026-05-21 at 8 15 20 PM" src="https://github.com/user-attachments/assets/3a271fbc-f12d-4e4e-af82-34490592b09a" />



---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm 9+

### 1. Clone the repository
```bash
git clone https://github.com/YOUR_USERNAME/StoryScape.git
cd StoryScape
```

### 2. Install all dependencies
```bash
npm run install-all
```

### 3. Configure environment variables
```bash
cp .env.example server/.env
```

Open `server/.env` and fill in your API keys (see table below).

### 4. Start development server
```bash
npm run dev
```

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5001

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

> **Note:** Email (SMTP) and Google OAuth are optional. In development mode, OTP codes are printed directly to the server console instead of being emailed.

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
│   │   ├── cover.js         # FLUX.1-schnell cover generation
│   │   ├── background.js    # FLUX.1-schnell background generation
│   │   ├── music.js         # Soundtrack placeholder (HF music unavailable)
│   │   ├── tts.js           # TTS (delegates to browser Web Speech API)
│   │   └── runner.js        # Orchestrates pipeline stages
│   ├── routes/              # Express routers
│   ├── middleware/          # JWT auth middleware
│   └── db.js                # SQLite schema & seed data
├── .env.example             # Environment variable template — copy to server/.env
└── package.json             # Root scripts (dev, install-all)
```

---

## 🛡️ Security Notes

- `server/.env` is in `.gitignore` and will **never** be committed
- The SQLite database (`server/storyscape.db`) is also in `.gitignore`
- AI-generated media (`server/public/covers/`, `backgrounds/`, `music/`) are excluded from git
- Never commit real API keys; always use the `.env.example` as the template

---

## 📜 License

MIT — see [`LICENSE`](LICENSE).

---

## Acknowledgements

- Google Antigravity 
- Claude
- https://github.com/satiricalguru
- https://github.com/sourishnandy4-cell

