import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { runPipeline, activePipelines } from '../pipeline/runner.js';
import { generateTTS } from '../pipeline/tts.js';

// pdf-parse is a CommonJS module; use createRequire to import it in ESM
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Multer configuration for file uploads (txt/pdf)
const uploadDir = path.resolve(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${uuidv4()}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Max 5MB
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== '.txt' && ext !== '.pdf') {
      return cb(new Error('Only .txt and .pdf files are allowed'));
    }
    cb(null, true);
  },
});

// Helper to extract text from file
async function extractTextFromFile(filePath, mimeType) {
  if (mimeType === 'text/plain' || filePath.endsWith('.txt')) {
    return fs.readFileSync(filePath, 'utf-8');
  } else if (filePath.endsWith('.pdf')) {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    return data.text || '';
  }
  return '';
}

// GET list all stories (no text body)
router.get('/', (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT id, title, author, genre, status, cover_url, background_url, views, likes, created_at 
      FROM stories 
      ORDER BY created_at DESC
    `).all();
    return res.json(rows);
  } catch (error) {
    console.error('Fetch stories error:', error);
    return res.status(500).json({ error: 'Failed to fetch stories' });
  }
});

// GET user bookmarked library
router.get('/my/library', authMiddleware, (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT s.id, s.title, s.author, s.genre, s.cover_url, b.progress, s.views, s.likes 
      FROM bookmarks b 
      JOIN stories s ON b.story_id = s.id 
      WHERE b.user_id = ?
      ORDER BY b.created_at DESC
    `).all(req.user.id);
    return res.json(rows);
  } catch (error) {
    console.error('Fetch library error:', error);
    return res.status(500).json({ error: 'Failed to fetch library' });
  }
});

// GET specific story details (and increment view count)
router.get('/:id', (req, res) => {
  const { id } = req.params;
  try {
    const story = db.prepare('SELECT * FROM stories WHERE id = ?').get(id);
    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }

    // Increment view count
    db.prepare('UPDATE stories SET views = views + 1 WHERE id = ?').run(id);
    story.views += 1;

    return res.json(story);
  } catch (error) {
    console.error('Fetch story error:', error);
    return res.status(500).json({ error: 'Failed to fetch story details' });
  }
});

// GET pipeline status
router.get('/:id/status', (req, res) => {
  const { id } = req.params;
  try {
    const active = activePipelines[id];
    if (active) {
      return res.json(active);
    }

    // Fallback to database
    const story = db.prepare('SELECT status FROM stories WHERE id = ?').get(id);
    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }

    if (story.status === 'complete') {
      return res.json({ stage: 'complete', progress: 100, statusText: 'Complete', error: null });
    } else if (story.status === 'failed') {
      return res.json({ stage: 'failed', progress: 100, statusText: 'Pipeline failed', error: 'Unknown pipeline error' });
    } else {
      return res.json({ stage: '1', progress: 0, statusText: 'Warming up...', error: null });
    }
  } catch (error) {
    console.error('Fetch status error:', error);
    return res.status(500).json({ error: 'Failed to fetch status' });
  }
});

// POST upload story (authenticated)
router.post('/upload', authMiddleware, upload.single('file'), async (req, res) => {
  const { title, genre } = req.body;
  let storyText = req.body.text;
  const author = req.user.name; // Pre-filled from profile

  if (!title || !genre) {
    return res.status(400).json({ error: 'Title and genre are required' });
  }

  // Handle file upload text extraction
  if (req.file) {
    try {
      storyText = extractTextFromFile(req.file.path, req.file.mimetype);
      // Clean up temp file
      fs.unlinkSync(req.file.path);
    } catch (err) {
      console.error('File parsing error:', err);
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(500).json({ error: 'Failed to read story file' });
    }
  }

  if (!storyText || storyText.trim().length === 0) {
    return res.status(400).json({ error: 'Story text content is required' });
  }

  try {
    const storyId = `story-${uuidv4().substring(0, 8)}`;
    const now = Date.now();

    db.prepare(`
      INSERT INTO stories (id, title, author, genre, text, status, user_id, created_at)
      VALUES (?, ?, ?, ?, ?, 'processing', ?, ?)
    `).run(storyId, title, author, genre, storyText, req.user.id, now);

    // Run the pipeline asynchronously in background
    runPipeline(storyId, storyText);

    return res.status(201).json({ storyId, message: 'Story created. Pipeline initiated.' });
  } catch (error) {
    console.error('Story upload error:', error);
    return res.status(500).json({ error: 'Server error uploading story' });
  }
});

// PUT like story (authenticated)
router.put('/:id/like', authMiddleware, (req, res) => {
  const { id } = req.params;
  try {
    const result = db.prepare('UPDATE stories SET likes = likes + 1 WHERE id = ?').run(id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Story not found' });
    }
    const updated = db.prepare('SELECT likes FROM stories WHERE id = ?').get(id);
    return res.json({ success: true, likes: updated.likes });
  } catch (error) {
    console.error('Like story error:', error);
    return res.status(500).json({ error: 'Failed to like story' });
  }
});

// PUT bookmark progress (authenticated)
router.put('/:id/bookmark', authMiddleware, (req, res) => {
  const { id: storyId } = req.params;
  const { progress } = req.body; // percentage read, e.g., 14
  const userId = req.user.id;

  try {
    const existing = db.prepare('SELECT * FROM bookmarks WHERE user_id = ? AND story_id = ?').get(userId, storyId);
    
    if (existing) {
      db.prepare('UPDATE bookmarks SET progress = ?, created_at = ? WHERE id = ?').run(
        progress || 0,
        Date.now(),
        existing.id
      );
    } else {
      const bookmarkId = `bookmark-${uuidv4().substring(0, 8)}`;
      db.prepare(`
        INSERT INTO bookmarks (id, user_id, story_id, progress, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(bookmarkId, userId, storyId, progress || 0, Date.now());
    }

    return res.json({ success: true, progress });
  } catch (error) {
    console.error('Bookmark story error:', error);
    return res.status(500).json({ error: 'Failed to bookmark story' });
  }
});

// GET bookmark status
router.get('/:id/bookmarked', authMiddleware, (req, res) => {
  const { id: storyId } = req.params;
  const userId = req.user.id;
  try {
    const bookmark = db.prepare('SELECT progress FROM bookmarks WHERE user_id = ? AND story_id = ?').get(userId, storyId);
    return res.json({ bookmarked: !!bookmark, progress: bookmark ? bookmark.progress : 0 });
  } catch (error) {
    console.error('Check bookmark error:', error);
    return res.status(500).json({ error: 'Failed to check bookmark status' });
  }
});

// POST text to speech (authenticated — prevents API credit abuse)
router.post('/tts', authMiddleware, async (req, res) => {
  const { text, voice_model } = req.body;
  if (!text) {
    return res.status(400).json({ error: 'Text content is required for TTS' });
  }

  try {
    const audioUrl = await generateTTS(text, voice_model || 'aria');
    return res.json({ url: audioUrl });
  } catch (error) {
    console.error('TTS execution error:', error.message);
    return res.status(500).json({ error: error.message });
  }
});

export default router;
