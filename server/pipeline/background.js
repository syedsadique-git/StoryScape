import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { callHFModel } from './hfHelper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function generateBackground(storyId, analysis) {
  const { setting, themes, visual_keywords } = analysis;
  const themesStr = Array.isArray(themes) ? themes.join(', ') : '';
  const keywordsStr = Array.isArray(visual_keywords) ? visual_keywords.join(', ') : '';
  
  const prompt = `${setting}, ${themesStr}, ${keywordsStr}, ultra-wide panoramic night scene, moody atmospheric lighting, bokeh foreground, mist and fog, fantasy environment concept art, 16:9 landscape, no text, no UI elements, no characters in foreground, cinematic, photorealistic`;
  
  console.log(`Generating background for story ${storyId} with prompt: "${prompt}"`);

  let imageBuffer;
  try {
    // Primary: FLUX.1-schnell (returns base64 JSON, decoded to Buffer by hfHelper)
    imageBuffer = await callHFModel(
      'black-forest-labs/FLUX.1-schnell',
      { inputs: prompt },
      'arraybuffer'
    );
  } catch (error) {
    console.error('FLUX.1-schnell background generation failed, trying stable-diffusion-3-medium:', error.message);
    try {
      // Fallback: Stable Diffusion 3 Medium
      imageBuffer = await callHFModel(
        'stabilityai/stable-diffusion-3-medium-diffusers',
        { inputs: prompt },
        'arraybuffer'
      );
    } catch (fallbackError) {
      console.error('SD3 Medium background generation also failed:', fallbackError.message);
      throw new Error('Failed to generate story background image using AI models.');
    }
  }

  // Ensure directories exist
  const outputDir = path.resolve(__dirname, '../public/backgrounds');
  fs.mkdirSync(outputDir, { recursive: true });

  const filePath = path.join(outputDir, `${storyId}.png`);
  fs.writeFileSync(filePath, Buffer.from(imageBuffer));
  
  return `/backgrounds/${storyId}.png`;
}
