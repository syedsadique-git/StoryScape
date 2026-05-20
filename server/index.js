import express from 'express';
import cors from 'cors';
import passport from 'passport';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import authRouter from './routes/auth.js';
import storiesRouter from './routes/stories.js';
import './db.js'; // Ensure database initializes and seeds

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

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

// Start Server
app.listen(PORT, () => {
  console.log(`StoryScape server listening on port ${PORT}`);
  console.log(`Static folder loaded at: ${path.join(__dirname, 'public')}`);
});
export default app;
