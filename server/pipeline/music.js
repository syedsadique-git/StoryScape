import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createAmbientWav } from './fallbackUtils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// NOTE: HuggingFace music generation models (facebook/musicgen-small etc.) are no longer
// available via the hf-inference provider on router.huggingface.co. Until a dedicated
// music API is configured, create a small deterministic ambient loop locally so stories
// still have an audible background track.
// Future improvement: integrate a paid music generation API (e.g. Suno, Udio, Replicate).

export async function generateMusic(storyId, analysis) {
  const { genre, mood } = analysis;

  console.log(`[Music] Creating local ambient soundtrack for story ${storyId} (${genre}/${mood}).`);

  const outputDir = path.resolve(__dirname, '../public/music');
  fs.mkdirSync(outputDir, { recursive: true });

  const placeholderPath = path.join(outputDir, `${storyId}-ambient.wav`);
  const placeholderUrl = `/music/${storyId}-ambient.wav`;

  if (!fs.existsSync(placeholderPath)) {
    createAmbientWav(placeholderPath, 24, `${storyId}:${genre}:${mood}`);
  }

  return placeholderUrl;
}
