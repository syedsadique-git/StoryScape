import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { callHFModel } from './hfHelper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function generateCover(storyId, analysis) {
  const { mood, genre, setting, visual_keywords } = analysis;
  const keywordsStr = Array.isArray(visual_keywords) ? visual_keywords.join(', ') : '';
  
  const prompt = `${mood} ${genre} book cover art, ${setting}, ${keywordsStr}, cinematic lighting, highly detailed, dark fantasy, professional book cover composition, 4k, artstation quality, portrait orientation`;
  
  console.log(`Generating cover for story ${storyId} with prompt: "${prompt}"`);

  let imageBuffer;
  try {
    // Try FLUX.1-schnell first
    imageBuffer = await callHFModel(
      'black-forest-labs/FLUX.1-schnell',
      { inputs: prompt },
      'arraybuffer'
    );
  } catch (error) {
    console.error('FLUX cover generation failed, falling back to SDXL:', error.message);
    try {
      // Fallback to SDXL
      imageBuffer = await callHFModel(
        'stabilityai/stable-diffusion-xl-base-1.0',
        { inputs: prompt },
        'arraybuffer'
      );
    } catch (fallbackError) {
      console.error('SDXL cover generation failed:', fallbackError.message);
      throw new Error('Failed to generate story cover art using AI models.');
    }
  }

  // Ensure directories exist
  const outputDir = path.resolve(__dirname, '../public/covers');
  fs.mkdirSync(outputDir, { recursive: true });

  const filePath = path.join(outputDir, `${storyId}.png`);
  fs.writeFileSync(filePath, Buffer.from(imageBuffer));
  
  return `/covers/${storyId}.png`;
}
