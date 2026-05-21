import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ttsDir = path.join(__dirname, '..', 'public', 'tts');

const KOKORO_MODEL_ID = 'onnx-community/Kokoro-82M-v1.0-ONNX';

const VOICE_PRESETS = {
  af_heart: { voice: 'af_heart' },
  af_bella: { voice: 'af_bella' },
  af_nicole: { voice: 'af_nicole' },
  af_sarah: { voice: 'af_sarah' },
  am_fenrir: { voice: 'am_fenrir' },
  am_michael: { voice: 'am_michael' },
  am_puck: { voice: 'am_puck' },
  bm_fable: { voice: 'bm_fable' },
};

let kokoroPromise;

async function getKokoro() {
  if (!kokoroPromise) {
    const { KokoroTTS } = await import('kokoro-js');
    kokoroPromise = KokoroTTS.from_pretrained(KOKORO_MODEL_ID, {
      dtype: 'q8',
      device: 'cpu',
    });
  }
  return kokoroPromise;
}

function normalizeText(text) {
  return text
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 1800);
}

export async function generateTTS(text, voicePreset = 'af_heart') {
  const cleanText = normalizeText(text);
  if (!cleanText) throw new Error('Text content is required for TTS');

  const preset = VOICE_PRESETS[voicePreset] || VOICE_PRESETS.af_heart;
  const hash = crypto
    .createHash('sha256')
    .update(`${preset.voice}:${cleanText}`)
    .digest('hex')
    .slice(0, 24);
  const filename = `${preset.voice}-${hash}.wav`;
  const outputPath = path.join(ttsDir, filename);

  if (fs.existsSync(outputPath)) {
    return `/tts/${filename}`;
  }

  fs.mkdirSync(ttsDir, { recursive: true });

  const kokoro = await getKokoro();
  const audio = await kokoro.generate(cleanText, { voice: preset.voice });
  await audio.save(outputPath);

  return `/tts/${filename}`;
}
