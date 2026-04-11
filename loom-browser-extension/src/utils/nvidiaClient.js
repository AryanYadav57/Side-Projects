const NVIDIA_BASE_URL = 'https://integrate.api.nvidia.com/v1';
const DEFAULT_MODEL = 'meta/llama-3.1-70b-instruct';

function getNvidiaApiKey() {
  const key = import.meta.env.VITE_NVIDIA_API_KEY;

  if (!key || key === 'replace_with_your_nvidia_key') {
    throw new Error('Missing NVIDIA API key. Set VITE_NVIDIA_API_KEY in .env.local.');
  }

  return key;
}

export async function nvidiaChatCompletion(messages, options = {}) {
  const apiKey = getNvidiaApiKey();
  const model = options.model || DEFAULT_MODEL;

  const response = await fetch(`${NVIDIA_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: options.temperature ?? 0.3,
      max_tokens: options.maxTokens ?? 512,
      stream: false,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`NVIDIA API request failed (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  return data?.choices?.[0]?.message?.content ?? '';
}
