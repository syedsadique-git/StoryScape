import express from 'express';
import cors from 'cors';
import passport from 'passport';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import authRouter from './routes/auth.js';
import storiesRouter from './routes/stories.js';
import db from './db.js'; // Ensure database initializes and seeds

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });

// ── Prevent unhandled promise rejections from crashing the process ──────────
process.on('unhandledRejection', (reason, promise) => {
  console.error('[StoryScape] Unhandled Promise Rejection at:', promise, '\nReason:', reason);
  // Do NOT exit — keep the server alive for other requests
});
process.on('uncaughtException', (err) => {
  console.error('[StoryScape] Uncaught Exception:', err);
  // Do NOT exit — only truly fatal errors should bring the server down
});

const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

const requiredEnvVars = [];
if (!process.env.HF_API_TOKEN || process.env.HF_API_TOKEN.includes('your_huggingface_token')) requiredEnvVars.push('HF_API_TOKEN');
if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.includes('your_gemini_api_key')) requiredEnvVars.push('GEMINI_API_KEY');
if (requiredEnvVars.length > 0) {
  console.warn(`Warning: Missing or placeholder environment variables: ${requiredEnvVars.join(', ')}. AI asset generation may fail until these are configured.`);
}

const publicDirs = ['covers', 'backgrounds', 'music', 'tts'];
for (const dir of publicDirs) {
  const target = path.join(__dirname, 'public', dir);
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }
}

// Middleware
app.use(cors({
  origin: CLIENT_URL,
  credentials: true
}));
app.use(express.json());
app.use(passport.initialize());

// Static folders serving
app.use(express.static(path.join(__dirname, 'public')));

// Routers
app.use('/api/auth', authRouter);
app.use('/api/stories', storiesRouter);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Express Global Error]:', err.stack);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

// ── Startup recovery: mark orphaned 'processing' stories as 'failed' ────────
// Stories stuck as 'processing' from a previous crash will never complete.
// Reset them so users see an accurate status rather than an endless spinner.
try {
  const stuckCount = db.prepare(
    "UPDATE stories SET status = 'failed' WHERE status = 'processing'"
  ).run().changes;
  if (stuckCount > 0) {
    console.warn(`[Startup] Marked ${stuckCount} interrupted story/stories as 'failed' (server was likely restarted mid-pipeline).`);
  }
} catch (e) {
  console.error('[Startup] Could not reset stuck pipelines:', e.message);
}

// Start Server
app.listen(PORT, () => {
  console.log(`StoryScape server listening on port ${PORT}`);
  console.log(`Static folder loaded at: ${path.join(__dirname, 'public')}`);
});
export default app;
