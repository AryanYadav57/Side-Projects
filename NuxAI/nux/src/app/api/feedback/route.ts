import { NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

interface FeedbackPayload {
  messageId?: string;
  helpful?: boolean;
  threadId?: string;
}

const feedbackStats = {
  helpful: 0,
  notHelpful: 0,
};

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const rate = checkRateLimit(`feedback:${ip}`, 60, 60_000);
    if (!rate.allowed) {
      return NextResponse.json({ ok: false, error: "Too many feedback events" }, { status: 429 });
    }

    const body = (await req.json()) as FeedbackPayload;
    if (!body.messageId || typeof body.helpful !== "boolean") {
      return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 });
    }

    if (body.helpful) {
      feedbackStats.helpful += 1;
    } else {
      feedbackStats.notHelpful += 1;
    }

    return NextResponse.json({ ok: true, stats: feedbackStats });
  } catch {
    return NextResponse.json({ ok: false, error: "Could not record feedback" }, { status: 500 });
  }
}
