import Link from "next/link";

const policyPoints = [
  "Nux does not provide sourcing, trafficking, synthesis, concealment, or unsafe optimization guidance.",
  "Responses are educational and uncertainty-aware, not a replacement for clinical care.",
  "Emergency symptom patterns are prioritized with immediate escalation language.",
  "Rate limits and abuse controls are applied to protect system safety and availability.",
  "Feedback signals are collected to improve response quality and harm-reduction clarity.",
];

export default function SafetyPolicyPage() {
  return (
    <main className="min-h-dvh bg-[#0f1318] px-4 py-8 text-[#ecf4e7] sm:px-6 md:px-10">
      <div className="mx-auto max-w-3xl rounded-3xl border border-white/12 bg-[#151b22]/82 p-6 shadow-[0_24px_64px_rgba(0,0,0,0.35)] backdrop-blur-xl md:p-8">
        <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-100/75">Nux Transparency</p>
        <h1 className="mt-2 font-heading text-4xl tracking-[-0.02em] text-white/95 md:text-5xl">Safety Policy</h1>
        <p className="mt-4 text-sm leading-relaxed text-white/78 md:text-base">
          Nux is designed for harm reduction. It provides practical risk awareness and escalation guidance while refusing unsafe or illegal instruction.
        </p>

        <ul className="mt-6 space-y-3 text-sm leading-relaxed text-white/82 md:text-base">
          {policyPoints.map((point) => (
            <li key={point} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
              {point}
            </li>
          ))}
        </ul>

        <div className="mt-7 flex flex-wrap items-center gap-3">
          <Link href="/" className="rounded-full border border-white/30 bg-white/8 px-4 py-2 text-xs uppercase tracking-[0.15em] text-white/90 transition hover:bg-white/14">
            Back Home
          </Link>
          <Link href="/chat" className="rounded-full border border-emerald-100/40 bg-emerald-200/15 px-4 py-2 text-xs uppercase tracking-[0.15em] text-emerald-100 transition hover:bg-emerald-200/24">
            Open Chat
          </Link>
        </div>
      </div>
    </main>
  );
}
