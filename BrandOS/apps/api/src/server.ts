import Fastify from 'fastify';
import cors from '@fastify/cors';
import * as dotenv from 'dotenv';

dotenv.config();

const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY;

if (!NVIDIA_API_KEY || NVIDIA_API_KEY === 'YOUR_KEY_HERE') {
  console.warn('\n⚠️  WARNING: NVIDIA_API_KEY is not set or is a placeholder.');
  console.warn('   Please set a valid API key in apps/api/.env');
  console.warn('   Get one at: https://build.nvidia.com/\n');
}

const fastify = Fastify({
  logger: true
});

fastify.register(cors, {
  origin: '*',
});

fastify.get('/api/health', async (request, reply) => {
  const keyStatus = NVIDIA_API_KEY && NVIDIA_API_KEY !== 'YOUR_KEY_HERE' ? 'configured' : 'missing';
  return { status: 'ok', service: 'brandos-api', apiKey: keyStatus };
});

// Helper: strip markdown fences from LLM responses
function stripMarkdown(text: string): string {
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '');
  return cleaned.trim();
}

// Helper: check API key before calling NVIDIA
function checkApiKey(reply: any): boolean {
  if (!NVIDIA_API_KEY || NVIDIA_API_KEY === 'YOUR_KEY_HERE') {
    reply.status(401).send({
      success: false,
      error: 'API key not configured',
      details: 'NVIDIA_API_KEY is missing or is a placeholder. Please set a valid key in apps/api/.env'
    });
    return false;
  }
  return true;
}

// Helper: handle NVIDIA API response errors
async function handleNvidiaError(response: Response): Promise<string> {
  const status = response.status;
  if (status === 401 || status === 403) {
    return 'API key is invalid or unauthorized. Please check your NVIDIA_API_KEY.';
  }
  if (status === 429) {
    return 'Rate limit exceeded. Please wait a moment and try again.';
  }
  const body = await response.text().catch(() => '');
  return `NVIDIA API error (${status}): ${response.statusText}. ${body}`.trim();
}

fastify.post('/api/generate-brand', async (request, reply) => {
  if (!checkApiKey(reply)) return;
  const { idea } = request.body as { idea: string };
  
  if (!idea) {
    return reply.status(400).send({ success: false, error: "Idea is required" });
  }

  try {
    const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${NVIDIA_API_KEY}`,
      },
      body: JSON.stringify({
        model: "meta/llama-3.1-70b-instruct",
        messages: [
          {
            role: "system",
            content: "You are the BrandOS Strategy Engine. Take the user's raw idea and distill it into a sharp, startup-ready brand vision. Output a short JSON object strictly with these fields: 'brandName', 'tagline', 'visionStatement', and 'valueProps'. 'valueProps' must be an array of exactly 3 objects, each with a 'title' and a 'description'. Do not include markdown blocks, just the JSON string."
          },
          {
            role: "user",
            content: idea
          }
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errMsg = await handleNvidiaError(response);
      const statusCode = (response.status === 401 || response.status === 403) ? 401 : 500;
      return reply.status(statusCode).send({ success: false, error: 'Failed to generate brand vision', details: errMsg });
    }

    const data = await response.json();
    let content = data.choices[0].message.content;
    content = stripMarkdown(content);
    
    const brandVision = JSON.parse(content);
    return { success: true, data: brandVision };
  } catch (error: any) {
    fastify.log.error(error);
    return reply.status(500).send({ success: false, error: "Failed to generate brand vision", details: error.message });
  }
});

fastify.post('/api/generate-visuals', async (request, reply) => {
  if (!checkApiKey(reply)) return;
  const { brandName, visionStatement } = request.body as { brandName: string, visionStatement: string };
  
  if (!brandName || !visionStatement) {
    return reply.status(400).send({ success: false, error: "brandName and visionStatement are required" });
  }

  try {
    const prompt = `A clean, minimalist, high-end vector logo design for a startup named "${brandName}". The startup's vision is: ${visionStatement}. Clean background, modern typography, flat design, highly professional, dribbble style.`;

    const response = await fetch('https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux_1-schnell', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${NVIDIA_API_KEY}`,
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        prompt: prompt,
        height: 1024,
        width: 1024,
        steps: 4,
        seed: 0,
        samples: 1
      }),
    });

    if (!response.ok) {
      const errMsg = await handleNvidiaError(response);
      const statusCode = (response.status === 401 || response.status === 403) ? 401 : 500;
      return reply.status(statusCode).send({ success: false, error: 'Failed to generate visual identity', details: errMsg });
    }

    const data = await response.json();
    // FLUX returns artifacts array with base64 images
    const base64Image = data.artifacts?.[0]?.base64 || data.data?.[0]?.b64_json;
    if (!base64Image) {
      return reply.status(500).send({ success: false, error: 'No image data returned from NVIDIA API' });
    }
    
    return { success: true, data: { logoUrl: `data:image/png;base64,${base64Image}` } };
  } catch (error: any) {
    fastify.log.error(error);
    return reply.status(500).send({ success: false, error: "Failed to generate visual identity", details: error.message });
  }
});

fastify.post('/api/refine-brand', async (request, reply) => {
  if (!checkApiKey(reply)) return;
  const { currentVision, instruction } = request.body as { currentVision: any, instruction: string };
  
  if (!currentVision || !instruction) {
    return reply.status(400).send({ success: false, error: "currentVision and instruction are required" });
  }

  try {
    const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${NVIDIA_API_KEY}`,
      },
      body: JSON.stringify({
        model: "meta/llama-3.1-70b-instruct",
        messages: [
          {
            role: "system",
            content: "You are the BrandOS Refinement Engine. You are given a current brand vision JSON and a user instruction. Apply the instruction to update the brand vision. Return ONLY valid JSON with exactly four keys: 'brandName', 'tagline', 'visionStatement', and 'valueProps' (an array of exactly 3 objects with 'title' and 'description'). Do not include any explanations, markdown wrapping, or extra text."
          },
          {
            role: "user",
            content: `Current Vision:\n${JSON.stringify(currentVision, null, 2)}\n\nInstruction: ${instruction}`
          }
        ],
        temperature: 0.7,
        max_tokens: 600,
      }),
    });

    if (!response.ok) {
      const errMsg = await handleNvidiaError(response);
      const statusCode = (response.status === 401 || response.status === 403) ? 401 : 500;
      return reply.status(statusCode).send({ success: false, error: 'Failed to refine brand vision', details: errMsg });
    }

    const data = await response.json();
    let content = data.choices[0].message.content;
    content = stripMarkdown(content);
    
    const updatedVision = JSON.parse(content);
    return { success: true, data: updatedVision };
  } catch (error: any) {
    fastify.log.error(error);
    return reply.status(500).send({ success: false, error: "Failed to refine brand vision", details: error.message });
  }
});

fastify.post('/api/generate-design-system', async (request, reply) => {
  if (!checkApiKey(reply)) return;
  const { brandName, visionStatement } = request.body as { brandName: string, visionStatement: string };
  
  if (!brandName || !visionStatement) {
    return reply.status(400).send({ success: false, error: "brandName and visionStatement are required" });
  }

  try {
    const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${NVIDIA_API_KEY}`,
      },
      body: JSON.stringify({
        model: "meta/llama-3.1-70b-instruct",
        messages: [
          {
            role: "system",
            content: "You are the BrandOS Design Architect. Based on the startup's brand name and vision, generate a centralized Design System JSON. Output ONLY valid JSON containing exactly these fields: 'colors': { 'primary': string(hex), 'secondary': string(hex), 'background': string(hex), 'text': string(hex) }, 'typography': { 'heading': string, 'body': string }, 'rules': { 'borderRadius': string, 'spacing': string }. No other text or markdown."
          },
          {
            role: "user",
            content: `Brand Name: ${brandName}\nVision: ${visionStatement}\nGenerate the design system tokens.`
          }
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errMsg = await handleNvidiaError(response);
      const statusCode = (response.status === 401 || response.status === 403) ? 401 : 500;
      return reply.status(statusCode).send({ success: false, error: 'Failed to generate design system', details: errMsg });
    }

    const data = await response.json();
    let content = data.choices[0].message.content;
    content = stripMarkdown(content);
    
    const designTokens = JSON.parse(content);
    return { success: true, data: designTokens };
  } catch (error: any) {
    fastify.log.error(error);
    return reply.status(500).send({ success: false, error: "Failed to generate design system", details: error.message });
  }
});

const start = async () => {
  try {
    await fastify.listen({ port: 3001, host: '0.0.0.0' });
    fastify.log.info(`API server listening on port 3001`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
