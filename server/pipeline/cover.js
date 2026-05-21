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
    // Primary: FLUX.1-schnell (returns base64 JSON, decoded to Buffer by hfHelper)
    imageBuffer = await callHFModel(
      'black-forest-labs/FLUX.1-schnell',
      { inputs: prompt },
      'arraybuffer'
    );
  } catch (error) {
    console.error('FLUX.1-schnell cover generation failed, trying stable-diffusion-3-medium:', error.message);
    try {
      // Fallback: Stable Diffusion 3 Medium
      imageBuffer = await callHFModel(
        'stabilityai/stable-diffusion-3-medium-diffusers',
        { inputs: prompt },
        'arraybuffer'
      );
    } catch (fallbackError) {
      console.error('SD3 Medium cover generation also failed:', fallbackError.message);
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
