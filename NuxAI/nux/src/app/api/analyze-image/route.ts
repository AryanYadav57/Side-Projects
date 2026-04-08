import { NextResponse } from "next/server";
import { mockImageAnalysis } from "@/lib/mock-vision";
import type { ImageAnalysisResult } from "@/types/chat";
import { getAIClientConfig } from "@/lib/ai-client";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const IMAGE_RATE_LIMIT = 12;
const IMAGE_RATE_WINDOW_MS = 60_000;

const PROMPT = `You are a harm-reduction assistant. Analyze a substance image with strict uncertainty.
Return JSON with shape:
{
  "likelySubstance": string,
  "confidence": number,
  "summary": string,
  "risks": string[],
  "redFlags": string[],
  "disclaimer": string
}
Rules:
- Do not claim certainty from appearance.
- Do not provide sourcing or exact dosing.
- Emphasize testing and emergency warning signs.
- confidence must be 0 to 1.
`;

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const rate = checkRateLimit(`image:${ip}`, IMAGE_RATE_LIMIT, IMAGE_RATE_WINDOW_MS);
    if (!rate.allowed) {
      return NextResponse.json(
        {
          error: "Too many image analyses. Please wait and try again.",
        },
        { status: 429 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("image");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Image is required" }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(mockImageAnalysis());
    }

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");
    const dataUrl = `data:${file.type};base64,${base64}`;

    const { client, visionModel } = getAIClientConfig(apiKey);
    const response = await client.responses.create({
      model: visionModel,
      input: [
        {
          role: "system",
          content: PROMPT,
        },
        {
          role: "user",
          content: [
            { type: "input_text", text: "Analyze this image with safety-focused uncertainty." },
            { type: "input_image", image_url: dataUrl, detail: "low" },
          ],
        },
      ],
      temperature: 0.2,
    });

    const text = response.output_text?.trim();
    if (!text) {
      return NextResponse.json(mockImageAnalysis());
    }

    const parsed = JSON.parse(text) as ImageAnalysisResult;

    return NextResponse.json({
      ...parsed,
      confidence: Math.max(0, Math.min(1, parsed.confidence ?? 0.3)),
      disclaimer:
        parsed.disclaimer ||
        "Image-based identification is uncertain. Use reagent testing and seek local medical guidance when in doubt.",
    });
  } catch {
    return NextResponse.json(mockImageAnalysis());
  }
}
