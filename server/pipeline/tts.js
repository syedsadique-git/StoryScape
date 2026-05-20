import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { callHFModel } from './hfHelper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const VOICE_MODELS = {
  aria: 'espnet/kan-bayashi_ljspeech_vits',
  nova: 'facebook/mms-tts-eng',
  echo: 'espnet/kan-bayashi_ljspeech_tacotron2',
  sage: 'coqui/XTTS-v2',
  spark: 'suno/bark',
};

export async function generateTTS(text, voicePreset = 'aria') {
  const modelName = VOICE_MODELS[voicePreset.toLowerCase()] || VOICE_MODELS.aria;
  
  // Create a unique hash of text + voice model for caching
  const hash = crypto.createHash('md5').update(text + modelName).digest('hex');
  
  const outputDir = path.resolve(__dirname, '../public/tts');
  fs.mkdirSync(outputDir, { recursive: true });
  
  const filePath = path.join(outputDir, `${hash}.wav`);
  const relativeUrl = `/tts/${hash}.wav`;

  // Return cached file if it exists
  if (fs.existsSync(filePath)) {
    console.log(`TTS cache hit for hash: ${hash}`);
    return relativeUrl;
  }

  console.log(`Generating TTS for model ${modelName} (cache miss)...`);

  try {
    const audioBuffer = await callHFModel(
      modelName,
      { inputs: text },
      'arraybuffer'
    );

    fs.writeFileSync(filePath, Buffer.from(audioBuffer));
    return relativeUrl;
  } catch (error) {
    console.error(`TTS generation failed for model ${modelName}:`, error.message);
    throw new Error(`Failed to generate speech using voice model: ${voicePreset}`);
  }
}
