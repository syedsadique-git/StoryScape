import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { callHFModel } from './hfHelper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function generateMusic(storyId, analysis) {
  const { genre, mood, themes } = analysis;
  const themesStr = Array.isArray(themes) ? themes.join(' ') : '';
  
  const prompt = `${genre} ${mood} ambient atmospheric background music, ${themesStr}, looping, instrumental, no vocals, cinematic score`;
  
  console.log(`Generating soundtrack for story ${storyId} with prompt: "${prompt}"`);

  let audioBuffer;
  try {
    audioBuffer = await callHFModel(
      'facebook/musicgen-small',
      { inputs: prompt },
      'arraybuffer'
    );
  } catch (error) {
    console.error('Music generation failed:', error.message);
    // If music generation fails, we don't block the story, we can just return null and handle it on frontend
    return null;
  }

  // Ensure directories exist
  const outputDir = path.resolve(__dirname, '../public/music');
  fs.mkdirSync(outputDir, { recursive: true });

  const filePath = path.join(outputDir, `${storyId}.wav`);
  fs.writeFileSync(filePath, Buffer.from(audioBuffer));
  
  return `/music/${storyId}.wav`;
}
