import { NextResponse } from "next/server";
import {
  blockedIntentReply,
  containsBlockedIntent,
  formatSafetyResponse,
  SYSTEM_PROMPT,
  withSafetyDisclaimer,
} from "@/lib/safety";
import type { ChatMessage } from "@/types/chat";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { getAIClientConfig } from "@/lib/ai-client";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

interface RequestPayload {
  message?: string;
  history?: ChatMessage[];
  stream?: boolean;
}

const CHAT_TIMEOUT_MS = 4000;
const NVIDIA_FAST_FALLBACK_MODEL = "meta/llama-3.1-8b-instruct";
const CHAT_RATE_LIMIT = 30;
const CHAT_RATE_WINDOW_MS = 60_000;

function fallbackReply(message: string): string {
  const lower = message.toLowerCase();

  if (/(what\s+is|about).*(lsd|acid)|\blsd\b/i.test(lower)) {
    return withSafetyDisclaimer(
      "LSD (lysergic acid diethylamide) is a potent psychedelic that can alter perception, mood, and sense of time for many hours. Risks include panic, confusion, unsafe decisions, and worsening mental health symptoms in vulnerable people. Avoid mixing with other substances, stay with trusted sober company, and seek urgent care for severe agitation, chest pain, or dangerous behavior."
    );
  }

  if (/(mdma|ecstasy|molly)/i.test(lower)) {
    return withSafetyDisclaimer(
      "MDMA can increase empathy and stimulation, but key risks include overheating, dehydration, low sodium from excess water intake, and dangerous interactions with antidepressants or stimulants. Use cooling, measured hydration, and avoid mixing. Seek emergency care for confusion, high temperature, seizure, or collapse."
    );
  }

  if (/(cannabis|weed|thc)/i.test(lower)) {
    return withSafetyDisclaimer(
      "Cannabis may cause relaxation but can also trigger anxiety, impaired coordination, and short-term memory issues. High-potency products raise risk of panic and disorientation. Avoid driving, avoid mixing with alcohol, and seek help if severe confusion or chest symptoms occur."
    );
  }

  if (/(seizure|unconscious|not breathing|overdose|chest pain)/i.test(lower)) {
    return withSafetyDisclaimer(
      "Those symptoms may be life-threatening. Call emergency services now. Keep the person on their side if unconscious and monitor breathing until help arrives."
    );
  }

  if (/(mix|interaction|combine)/i.test(lower)) {
    return withSafetyDisclaimer(
      "Mixing substances can create unpredictable risks, especially with alcohol, opioids, benzodiazepines, stimulants, and antidepressants. If possible, avoid combining and stay with a trusted sober person."
    );
  }

  return withSafetyDisclaimer(
    "I can help explain likely effects, key risks, and warning signs. Share what substance or situation you are asking about, and I will focus on safer choices and red flags."
  );
}

function buildCompletionMessages(message: string, history: ChatMessage[]): ChatCompletionMessageParam[] {
  return [
    {
      role: "system",
      content: SYSTEM_PROMPT,
    },
    ...history.slice(-10).map((item) => ({
      role: item.role,
      content: item.content,
    })),
    {
      role: "user",
      content: message,
    },
  ];
}

async function createSingleCompletion(
  apiKey: string,
  completionMessages: ChatCompletionMessageParam[]
) {
  const { client, model, provider } = getAIClientConfig(apiKey);

  const runCompletionWithTimeout = async (selectedModel: string, timeoutMs: number) =>
    Promise.race([
      client.chat.completions.create({
        model: selectedModel,
        messages: completionMessages,
        temperature: 0.3,
      }),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("CHAT_TIMEOUT")), timeoutMs);
      }),
    ]);

  try {
    return await runCompletionWithTimeout(model, CHAT_TIMEOUT_MS);
  } catch (error) {
    const isTimeout = error instanceof Error && error.message === "CHAT_TIMEOUT";
    const canRetryFastModel = provider === "nvidia" && model !== NVIDIA_FAST_FALLBACK_MODEL;

    if (!isTimeout || !canRetryFastModel) {
      throw error;
    }

    return runCompletionWithTimeout(NVIDIA_FAST_FALLBACK_MODEL, 8000);
  }
}

async function createStreamingResponse(
  apiKey: string,
  completionMessages: ChatCompletionMessageParam[],
  message: string
) {
  const encoder = new TextEncoder();
  const { client, model, provider } = getAIClientConfig(apiKey);

  const streamModel = provider === "nvidia" ? NVIDIA_FAST_FALLBACK_MODEL : model;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const response = await client.chat.completions.create({
          model: streamModel,
          messages: completionMessages,
          temperature: 0.3,
          stream: true,
        });

        for await (const chunk of response) {
          const delta = chunk.choices?.[0]?.delta?.content;
          if (delta) {
            controller.enqueue(encoder.encode(delta));
          }
        }
      } catch (error) {
        console.error("/api/chat stream failed, serving fallback:", error);
        controller.enqueue(encoder.encode(fallbackReply(message)));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

export async function POST(req: Request) {
  let message = "";

  try {
    const ip = getClientIp(req);
    const rate = checkRateLimit(`chat:${ip}`, CHAT_RATE_LIMIT, CHAT_RATE_WINDOW_MS);
    if (!rate.allowed) {
      return NextResponse.json(
        {
          reply: withSafetyDisclaimer(
            "You are sending messages too quickly. Wait about a minute, then retry. If there is a medical emergency, call local emergency services immediately."
          ),
        },
        { status: 429 }
      );
    }

    const body = (await req.json()) as RequestPayload;
    message = body.message?.trim() ?? "";
    const history = body.history ?? [];
    const shouldStream = Boolean(body.stream);

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    if (containsBlockedIntent(message)) {
      if (shouldStream) {
        return new Response(blockedIntentReply(), {
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      }
      return NextResponse.json({ reply: blockedIntentReply() });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      const reply = formatSafetyResponse(fallbackReply(message));
      if (shouldStream) {
        return new Response(reply, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
      }
      return NextResponse.json({ reply });
    }

    const completionMessages = buildCompletionMessages(message, history);

    if (shouldStream) {
      return createStreamingResponse(apiKey, completionMessages, message);
    }

    const response = await createSingleCompletion(apiKey, completionMessages);
    const raw = response.choices[0]?.message?.content?.trim() || fallbackReply(message);
    return NextResponse.json({ reply: formatSafetyResponse(raw) });
  } catch (error) {
    console.error("/api/chat failed, serving fallback:", error);

    if (error instanceof Error && error.message === "CHAT_TIMEOUT") {
      return NextResponse.json(
        {
          reply: formatSafetyResponse(
            "I am taking too long to reach the model right now. Here is a quick safety-first answer while I recover: " +
              fallbackReply(message)
          ),
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        reply: formatSafetyResponse(fallbackReply(message)),
      },
      { status: 200 }
    );
  }
}
