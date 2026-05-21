import axios from 'axios';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Determine if this model is an audio model (vs image model)
function isAudioModel(model) {
  return (
    model.includes('musicgen') ||
    model.includes('tts') ||
    model.includes('bark') ||
    model.includes('vits') ||
    model.includes('mms')
  );
}

export async function callHFModel(model, data, responseType = 'json', retries = 3) {
  const token = process.env.HF_API_TOKEN;
  if (!token || token.includes('your_huggingface_token')) {
    throw new Error('Hugging Face API token is not configured in .env');
  }

  const url = `https://router.huggingface.co/hf-inference/models/${model}`;

  // ── HF Router Accept header rules (updated 2025) ───────────────────────────
  // Image models (FLUX etc.) require Accept: application/json.
  //   The router returns the image as a base64-encoded JSON string, NOT raw bytes.
  // Audio models still use audio/* and return raw audio bytes.
  // Text/JSON models: omit Accept so axios uses its default.
  const isImage = responseType === 'arraybuffer' && !isAudioModel(model);
  const isAudio = responseType === 'arraybuffer' && isAudioModel(model);

  // For image models we must fetch as text because the response is a JSON base64 string
  const axiosResponseType = isImage ? 'text' : responseType;
  const acceptHeader = isImage
    ? 'application/json'
    : isAudio
      ? 'audio/wav, audio/flac, audio/*, */*'
      : undefined;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await axios({
        method: 'post',
        url,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...(acceptHeader ? { Accept: acceptHeader } : {}),
        },
        data,
        responseType: axiosResponseType,
      });

      // ── IMAGE: decode base64 JSON string → Buffer ─────────────────────────
      if (isImage) {
        const raw = response.data;
        // HF returns a JSON-encoded base64 string: "iVBORw0KGgo..." (with surrounding quotes)
        // Strip the outer JSON string quotes if present, then base64 decode.
        let b64 = typeof raw === 'string' ? raw : '';
        if (b64.startsWith('"') && b64.endsWith('"')) {
          b64 = b64.slice(1, -1);
        }
        if (!b64 || b64.length < 100) {
          throw new Error(`HF image response is empty or too small (${b64.length} chars)`);
        }
        return Buffer.from(b64, 'base64');
      }

      // ── JSON: check for HF-specific loading / error states ────────────────
      if (responseType === 'json' && response.data) {
        if (response.data.error && response.data.error.includes('loading')) {
          const waitTime = (response.data.estimated_time || 20) * 1000;
          console.log(`HF Model ${model} is loading. Attempt ${attempt}/${retries}. Waiting ${waitTime / 1000}s...`);
          await sleep(waitTime);
          continue;
        }
      }

      return response.data;
    } catch (error) {
      // Log the actual HF error body for debugging
      let errDetail = '';
      try {
        const raw = error.response?.data;
        errDetail = raw instanceof ArrayBuffer || Buffer.isBuffer(raw)
          ? Buffer.from(raw).toString().substring(0, 200)
          : JSON.stringify(raw)?.substring(0, 200) || '';
      } catch (e) { /* ignore */ }

      console.error(`Error calling HF Model ${model} (Attempt ${attempt}/${retries}):`, error.response?.status, error.message, errDetail ? `| ${errDetail}` : '');

      // Handle 503 Service Unavailable (Model loading)
      if (error.response?.status === 503 || (error.response?.status === 500 && error.message.includes('loading'))) {
        // Try parsing error details to see if there's an estimated time
        let waitTime = 20000;
        try {
          const errorData = JSON.parse(Buffer.from(error.response.data).toString());
          if (errorData.estimated_time) {
            waitTime = errorData.estimated_time * 1000;
          }
        } catch (e) {
          // ignore
        }
        console.log(`Model is loading. Waiting ${waitTime / 1000}s before retrying...`);
        await sleep(waitTime);
        continue;
      }

      // Handle 429 Too Many Requests
      if (error.response?.status === 429) {
        console.log('HF Rate limit hit. Waiting 10 seconds before retry...');
        await sleep(10000);
        continue;
      }

      // If we ran out of retries, throw the error
      if (attempt === retries) {
        throw error;
      }
    }
  }

  throw new Error(`Failed to load HF Model ${model} after ${retries} attempts.`);
}
