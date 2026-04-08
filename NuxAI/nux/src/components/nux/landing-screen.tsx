"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import gsap from "gsap";

const steps = [
  {
    title: "Ask or Upload",
    text: "Start with a question or image and Nux converts uncertainty into practical safety guidance.",
  },
  {
    title: "Understand Risks",
    text: "Get clear interaction warnings, red flags, and confidence-aware response framing.",
  },
  {
    title: "Act Safer",
    text: "Follow safer-next-step recommendations and emergency escalation cues when needed.",
  },
];

export default function LandingScreen() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) {
      return;
    }

    gsap.defaults({ duration: 0.8, ease: "power2.out" });
    gsap.fromTo(
      ".home-reveal",
      { y: 24, autoAlpha: 0 },
      { y: 0, autoAlpha: 1, stagger: { each: 0.08, from: "start" } }
    );

    const mm = gsap.matchMedia();
    mm.add(
      {
        desktop: "(min-width: 920px)",
        reduceMotion: "(prefers-reduced-motion: reduce)",
      },
      (ctx) => {
        const conditions = (ctx.conditions ?? {}) as {
          desktop?: boolean;
          reduceMotion?: boolean;
        };

        if (!conditions.reduceMotion) {
          gsap.to(".orb-a", {
            x: "+=95",
            y: "-=60",
            duration: 11,
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut",
          });
          gsap.to(".orb-b", {
            x: "-=74",
            y: "+=58",
            duration: 13,
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut",
          });
        }

        if (!conditions.desktop || conditions.reduceMotion) {
          return;
        }

        const onMove = (event: MouseEvent) => {
          const bounds = root.getBoundingClientRect();
          const x = (event.clientX - bounds.left) / bounds.width - 0.5;
          const y = (event.clientY - bounds.top) / bounds.height - 0.5;

          gsap.to(".parallax-soft", {
            x: x * 16,
            y: y * 12,
            duration: 0.9,
            ease: "power3.out",
            overwrite: "auto",
          });
        };

        root.addEventListener("mousemove", onMove);
        return () => {
          root.removeEventListener("mousemove", onMove);
          gsap.set(".parallax-soft", { clearProps: "transform" });
        };
      }
    );

    return () => mm.revert();
  }, []);

  return (
    <div ref={rootRef} className="relative min-h-screen overflow-x-hidden bg-[#1b1d21] text-[#f2f5ef]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_12%,#3f5244,transparent_34%),radial-gradient(circle_at_86%_8%,#5a6f50,transparent_28%),linear-gradient(145deg,#16181d,#1e2127_58%,#1a1d22)]" />

      <main className="relative z-10 mx-auto max-w-[1220px] px-4 py-5 sm:px-6 md:px-8 md:py-7">
        <section className="relative overflow-hidden rounded-[22px] border border-white/12 bg-[linear-gradient(125deg,#778f57_0%,#8fa969_45%,#7f9561_72%,#748852_100%)] px-5 pb-6 pt-5 shadow-[0_30px_90px_rgba(0,0,0,0.36)] sm:px-8 sm:pb-8 sm:pt-6 md:px-10 md:pb-10 md:pt-8">
          <div className="orb-a parallax-soft pointer-events-none absolute -left-16 top-10 h-72 w-72 rounded-full bg-[#305740]/60 blur-[88px]" />
          <div className="orb-b parallax-soft pointer-events-none absolute -right-14 top-8 h-56 w-56 rounded-full bg-[#9abb75]/35 blur-[84px]" />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent_62%,rgba(20,24,21,0.22)_100%)]" />

          <header className="home-reveal relative flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-white/96">
              <div className="flex items-center gap-1.5">
                <span className="h-4 w-4 rounded-full border border-white/90" />
                <span className="h-4 w-4 rounded-full border border-white/90" />
              </div>
              <span className="font-heading text-[30px] leading-none tracking-tight sm:text-[34px]">nux</span>
            </div>

            <nav className="flex items-center gap-2 text-[9px] uppercase tracking-[0.16em] text-white/84 sm:gap-6 sm:text-[10px] sm:tracking-[0.18em]">
              <a href="#how" className="hidden transition hover:text-white sm:inline">About</a>
              <Link href="/safety" className="hidden transition hover:text-white sm:inline">Policy</Link>
              <a href="https://github.com/Aryan" target="_blank" rel="noreferrer" className="hidden transition hover:text-white sm:inline">
                GitHub
              </a>
              <Link href="/chat" className="rounded-full border border-white/70 px-3 py-1.5 transition hover:bg-white/20 sm:px-4 sm:py-2">
                Open Chat
              </Link>
            </nav>
          </header>

          <div className="home-reveal relative mx-auto mt-14 max-w-[940px] text-center sm:mt-20 md:mt-24">
            <p className="text-balance font-heading text-[31px] leading-[1.1] tracking-[-0.02em] text-white/95 sm:text-[56px] md:text-[68px]">
              realize safer choices
            </p>
            <p className="mt-2 text-balance font-heading text-[31px] leading-[1.1] tracking-[-0.02em] text-white/90 sm:text-[56px] md:text-[68px]">
              reduce uncertainty and protect your future self
            </p>
          </div>

          <div className="home-reveal relative mt-12 grid items-end gap-6 text-white/84 sm:mt-20 sm:grid-cols-[1fr_auto] md:mt-24">
            <div className="hidden items-end gap-3 sm:flex">
              <p className="text-[10px] uppercase tracking-[0.22em] text-white/72 [writing-mode:vertical-rl]">Scroll</p>
              <span className="h-9 w-px bg-white/50" />
            </div>
            <div className="justify-self-start sm:justify-self-end">
              <p className="max-w-xs text-xs leading-relaxed text-white/82 sm:text-[13px]">
                Nux is a safety-first AI assistant that helps you understand effects, interactions, and warning signs with practical harm-reduction guidance.
              </p>
              <Link href="/chat" className="mt-4 inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-white/95 transition hover:gap-3">
                Get Started <span aria-hidden>→</span>
              </Link>
            </div>
          </div>
        </section>

        <section id="how" className="home-reveal mt-10 rounded-[24px] border border-white/14 bg-[#171a1f]/85 p-5 backdrop-blur-xl md:mt-12 md:p-7">
          <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-100/80">How Nux Works</p>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {steps.map((step, index) => (
              <article key={step.title} className="rounded-2xl border border-white/12 bg-white/6 p-4">
                <p className="text-[10px] uppercase tracking-[0.18em] text-emerald-100/75">Step {index + 1}</p>
                <h3 className="mt-1 font-heading text-2xl text-white/95">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/75">{step.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="trust" className="home-reveal mt-8 pb-4">
          <div className="rounded-[22px] border border-amber-100/24 bg-amber-100/8 px-4 py-3 text-xs text-amber-100/95 md:px-5">
            Medical disclaimer: Nux is educational support, not a substitute for medical care. For chest pain, breathing trouble, seizure, confusion, or loss of consciousness, call emergency services immediately.
          </div>
        </section>
      </main>
    </div>
  );
}
