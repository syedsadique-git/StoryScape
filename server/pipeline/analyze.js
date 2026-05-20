import { GoogleGenerativeAI } from '@google/generative-ai';
import { callHFModel } from './hfHelper.js';

const SYSTEM_PROMPT = `You are a literary analyst. Read the provided story text and output ONLY a valid JSON object — no markdown, no code fences, no explanation — with exactly these keys:
{
  "title": "story title",
  "genre": "primary genre",
  "themes": ["theme1", "theme2", "theme3"],
  "mood": "one word",
  "setting": "one descriptive sentence",
  "characters": ["character names"],
  "plot_summary": "max 2 sentences",
  "visual_keywords": ["8 vivid descriptors suitable for AI image generation"]
}`;

function cleanJSONString(text) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end >= start) {
    return text.substring(start, end + 1);
  }
  return text;
}

async function analyzeWithGemini(storyText, isRetry = false) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.includes('your_gemini_api_key')) {
    throw new Error('Gemini API key is not configured');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  // Using gemini-2.5-flash as specified
  const model = genAI.getGenerativeModel({ 
    model: 'gemini-2.5-flash',
    generationConfig: { responseMimeType: "application/json" }
  });

  const prompt = isRetry 
    ? `Strict instructions: Respond ONLY with a raw JSON object. Do not wrap in markdown \`\`\`json. Match this schema exactly:\n${SYSTEM_PROMPT}\n\nStory:\n${storyText}`
    : `${SYSTEM_PROMPT}\n\nStory:\n${storyText}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  return JSON.parse(cleanJSONString(text));
}

async function analyzeWithHF(storyText) {
  console.log('Falling back to Hugging Face Mixtral-8x7B for analysis...');
  const prompt = `<s>[INST] ${SYSTEM_PROMPT}\n\nStory:\n${storyText} [/INST]`;
  
  const response = await callHFModel('mistralai/Mixtral-8x7B-Instruct-v0.1', {
    inputs: prompt,
    parameters: {
      max_new_tokens: 1000,
      return_full_text: false
    }
  });

  // HF conversational text model returns array with generated_text
  const text = response[0]?.generated_text || '';
  return JSON.parse(cleanJSONString(text));
}

export async function analyzeStory(storyText) {
  try {
    return await analyzeWithGemini(storyText);
  } catch (error) {
    console.error('Gemini analysis failed or JSON parse error:', error.message);
    // Try once more with a stricter prompt if it was a JSON parse error
    if (error instanceof SyntaxError) {
      try {
        console.log('Retrying Gemini with stricter prompt...');
        return await analyzeWithGemini(storyText, true);
      } catch (retryError) {
        console.error('Gemini retry failed:', retryError.message);
      }
    }
    
    // Fallback to Hugging Face Mixtral
    try {
      return await analyzeWithHF(storyText);
    } catch (hfError) {
      console.error('HF Fallback analysis failed:', hfError.message);
      throw new Error('All story analysis models failed. Please check your API keys.');
    }
  }
}
