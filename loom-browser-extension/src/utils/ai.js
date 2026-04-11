const NVIDIA_BASE_URL = 'https://integrate.api.nvidia.com/v1';
const DEFAULT_MODEL = 'meta/llama-3.1-70b-instruct';

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'that', 'with', 'this', 'from', 'have', 'are', 'was', 'were', 'your', 'about', 'into', 'over', 'under',
  'than', 'then', 'there', 'their', 'they', 'them', 'will', 'would', 'should', 'could', 'been', 'being', 'also', 'after', 'before',
  'because', 'while', 'where', 'when', 'which', 'what', 'how', 'why', 'you', 'our', 'out', 'not', 'but', 'all', 'any', 'can', 'its',
]);

function safeJsonParse(input) {
  try {
    return JSON.parse(input);
  } catch {
    return null;
  }
}

function extractJsonBlock(text) {
  if (!text || typeof text !== 'string') return null;
  const direct = safeJsonParse(text);
  if (direct) return direct;

  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');
  if (first < 0 || last <= first) return null;

  return safeJsonParse(text.slice(first, last + 1));
}

function clampConfidence(value) {
  const num = Number(value);
  if (Number.isNaN(num)) return 0;
  return Math.max(0, Math.min(1, num));
}

function normalizeList(items, fieldKeys = []) {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => {
      if (typeof item === 'string') return item.trim();
      if (!item || typeof item !== 'object') return String(item || '').trim();
      for (const key of fieldKeys) {
        if (typeof item[key] === 'string' && item[key].trim()) {
          return item[key].trim();
        }
      }
      return '';
    })
    .filter(Boolean);
}

function normalizeExtractionShape(raw) {
  const extraction = raw && typeof raw === 'object' ? raw : {};
  return {
    concepts: normalizeList(extraction.concepts, ['name', 'label', 'title', 'concept']).slice(0, 8),
    entities: normalizeList(extraction.entities, ['name', 'label', 'title', 'entity']).slice(0, 6),
    claims: normalizeList(extraction.claims, ['claim', 'name', 'label', 'title']).slice(0, 3),
    summary: typeof extraction.summary === 'string' ? extraction.summary.trim() : '',
    confidence: clampConfidence(extraction.confidence),
  };
}

function heuristicExtraction(text, title = '') {
  const words = (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 3 && !STOP_WORDS.has(word));

  const freq = new Map();
  words.forEach((word) => freq.set(word, (freq.get(word) || 0) + 1));

  const concepts = [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([word]) => word);

  const entityMatches = (text || '').match(/\b[A-Z][A-Za-z0-9+.-]{2,}\b/g) || [];
  const entities = [...new Set(entityMatches)].slice(0, 6);

  const claims = (text || '')
    .split(/(?<=[.!?])\s+/)
    .filter((sentence) => /\b(is|are|can|should|must|unlike|because)\b/i.test(sentence))
    .slice(0, 3)
    .map((sentence) => sentence.trim());

  return {
    concepts,
    entities,
    claims,
    summary: (title || 'Page knowledge extraction').slice(0, 220),
    confidence: concepts.length ? 0.67 : 0.48,
  };
}

async function callNvidiaExtraction({ title, domain, text, apiKey, model = DEFAULT_MODEL }) {
  const systemPrompt = [
    'You are a semantic knowledge extractor.',
    'Extract reusable concepts, entities, and claims from webpage content.',
    'Respond with valid JSON only and no extra commentary.',
  ].join(' ');

  const userPrompt = `Page Title: ${title}\nDomain: ${domain}\nContent: ${text}\n\nReturn JSON:\n{\n  "concepts": [],\n  "entities": [],\n  "claims": [],\n  "summary": "",\n  "confidence": 0.0\n}`;

  const response = await fetch(`${NVIDIA_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      max_tokens: 700,
      stream: false,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`NVIDIA extraction failed (${response.status}): ${detail}`);
  }

  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content || '';
  const parsed = extractJsonBlock(content);
  if (!parsed) {
    throw new Error('NVIDIA extraction response was not valid JSON.');
  }

  return normalizeExtractionShape(parsed);
}

export async function extractKnowledge(payload) {
  const { title = '', domain = '', text = '', apiKey = '' } = payload || {};

  if (!text) {
    return {
      concepts: [],
      entities: [],
      claims: [],
      summary: '',
      confidence: 0,
      provider: 'none',
    };
  }

  if (apiKey) {
    try {
      const extraction = await callNvidiaExtraction({ title, domain, text, apiKey });
      return { ...extraction, provider: 'nvidia' };
    } catch (error) {
      console.warn('NVIDIA extraction failed, falling back to heuristic mode:', error?.message || error);
    }
  }

  return {
    ...heuristicExtraction(text, title),
    provider: 'heuristic',
  };
}
