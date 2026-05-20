import axios from 'axios';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function callHFModel(model, data, responseType = 'json', retries = 3) {
  const token = process.env.HF_API_TOKEN;
  if (!token || token.includes('your_huggingface_token')) {
    throw new Error('Hugging Face API token is not configured in .env');
  }

  const url = `https://api-inference.huggingface.co/models/${model}`;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await axios({
        method: 'post',
        url,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        data,
        responseType,
      });

      // If responseType is json, check for Hugging Face specific loading/error states in payload
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
      console.error(`Error calling HF Model ${model} (Attempt ${attempt}/${retries}):`, error.response?.status, error.message);

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
