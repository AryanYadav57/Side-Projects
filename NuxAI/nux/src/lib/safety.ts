const BLOCKED_PATTERNS = [
  /where\s+to\s+buy/i,
  /source\s+\w+/i,
  /dealer/i,
  /cook\s+.*drug/i,
  /synthesize/i,
  /stealth\s+use/i,
  /exact\s+dose/i,
  /lethal\s+dose/i,
];

const SAFETY_BANNER =
  "Nux is educational harm-reduction support, not medical or legal advice. If someone has chest pain, breathing trouble, seizure, confusion, loss of consciousness, or overheating, call emergency services now.";

const SAFETY_SOURCES = [
  "NIDA drug facts and overdose prevention",
  "CDC emergency symptom guidance",
  "WHO substance use harm-reduction resources",
  "Local poison control / emergency medical services",
];

const STRUCTURED_HEADINGS = [
  "### Summary",
  "### Key Risks",
  "### Safer Next Steps",
  "### Emergency Red Flags",
  "### Sources (general education)",
];

export function containsBlockedIntent(text: string): boolean {
  return BLOCKED_PATTERNS.some((pattern) => pattern.test(text));
}

export function withSafetyDisclaimer(text: string): string {
  if (text.includes("Nux is educational harm-reduction support")) {
    return text;
  }

  return `${text}\n\n${SAFETY_BANNER}`;
}

export function blockedIntentReply(): string {
  return withSafetyDisclaimer(
    "I can help with risk awareness and safer decision-making, but I cannot assist with sourcing, production, or optimization of illegal substance use."
  );
}

function ensureBulletList(content: string): string {
  const cleaned = content.trim();
  if (!cleaned) {
    return "- Not enough detail provided to assess confidently.";
  }

  if (/^[-*]\s+/m.test(cleaned)) {
    return cleaned;
  }

  const parts = cleaned
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 4);

  return parts.length ? parts.map((item) => `- ${item}`).join("\n") : "- Not enough detail provided to assess confidently.";
}

export function formatSafetyResponse(rawText: string): string {
  const raw = rawText.trim();
  const alreadyStructured = STRUCTURED_HEADINGS.every((heading) => raw.includes(heading));
  const timestamp = new Date().toISOString();

  if (alreadyStructured) {
    return withSafetyDisclaimer(`${raw}\n\nGenerated: ${timestamp}`);
  }

  const compact = raw
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join(" ");

  const sentenceParts = compact.split(/(?<=[.!?])\s+/).filter(Boolean);
  const summary = sentenceParts.slice(0, 2).join(" ") || "I can provide a safety-focused overview with uncertainty-aware guidance.";
  const remaining = sentenceParts.slice(2).join(" ");

  const risks = ensureBulletList(
    remaining ||
      "Potential panic, impaired judgment, dangerous interactions, and worsening mental health symptoms."
  );

  const saferSteps = ensureBulletList(
    "Stay with trusted sober company in a calm environment. Avoid mixing substances. Hydrate carefully and monitor symptoms."
  );

  const redFlags = ensureBulletList(
    "Chest pain, breathing trouble, seizure, confusion, collapse, unresponsiveness, or dangerously high body temperature."
  );

  const sources = SAFETY_SOURCES.map((item) => `- ${item}`).join("\n");

  const structured = [
    "### Summary",
    summary,
    "",
    "### Key Risks",
    risks,
    "",
    "### Safer Next Steps",
    saferSteps,
    "",
    "### Emergency Red Flags",
    redFlags,
    "",
    "### Sources (general education)",
    sources,
    "",
    `Generated: ${timestamp}`,
  ].join("\n");

  return withSafetyDisclaimer(structured);
}

export const SYSTEM_PROMPT = `You are Nux, a harm-reduction assistant.
Rules:
1. Be calm, factual, and non-judgmental.
2. Do not provide sourcing, trafficking, synthesis, concealment, or optimization of illegal drug use.
3. Do not provide precise dosing instructions. Share only conservative risk framing and uncertainty.
4. Explain acute risks, interactions to avoid, and red-flag symptoms that need urgent medical help.
5. Always include a brief disclaimer that your response is educational and not a substitute for medical care.
6. Encourage hydration, trusted company, safer environment, and seeking professional help when needed.
`;