"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/* ─── Motion Variants ─── */
const cinematic = {
  duration: 0.8,
  ease: [0.16, 1, 0.3, 1] as const,
};

const stagger = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.15 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: cinematic },
};

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.6 } },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: { opacity: 1, scale: 1, transition: cinematic },
};

/* ─── SVG Icons (no emojis per UI/UX Pro) ─── */
const SparkleIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M8 0L9.79 6.21L16 8L9.79 9.79L8 16L6.21 9.79L0 8L6.21 6.21L8 0Z" fill="currentColor" />
  </svg>
);

const ArrowUpIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" />
  </svg>
);

const ChevronLeftIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const DownloadIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);

const CloseIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

const PenToolIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/>
  </svg>
);

const LayersIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>
  </svg>
);

const ZapIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
  </svg>
);

const ArrowRightIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
  </svg>
);

const LoadingSpinner = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="animate-spin" aria-hidden="true">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeDashoffset="12" strokeLinecap="round" />
  </svg>
);

/* ─── Animated Counter (GSAP-powered) ─── */
function AnimatedCounter({ value, suffix = "" }: { value: string; suffix?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-40px" });
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    if (!isInView || !ref.current) return;
    const numericPart = value.replace(/[^0-9.]/g, "");
    const prefix = value.replace(/[0-9.].*/g, "");
    const target = parseFloat(numericPart);
    if (isNaN(target)) return;

    const obj = { val: 0 };
    gsap.to(obj, {
      val: target,
      duration: 1.6,
      ease: "power2.out",
      onUpdate: () => {
        const isWholeTarget = target === Math.floor(target);
        const v = isWholeTarget ? Math.round(obj.val) : obj.val.toFixed(1);
        setDisplay(`${prefix}${v}${suffix}`);
      },
    });
  }, [isInView, value, suffix]);

  return <div ref={ref}>{display}</div>;
}

/* ─── Types ─── */
interface BrandVision {
  brandName?: string;
  tagline?: string;
  visionStatement?: string;
  valueProps?: { title: string; description: string }[];
}

interface DesignTokens {
  colors?: { primary?: string; secondary?: string; background?: string; text?: string };
  typography?: { heading?: string; body?: string };
  rules?: { borderRadius?: string; spacing?: string };
}

/* ─── API Config ─── */
const API_BASE = "http://127.0.0.1:3001";

async function apiFetch<T>(endpoint: string, body: Record<string, unknown>): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const detail = (errData as { details?: string }).details || res.statusText;
      if (res.status === 401 || res.status === 403 || detail.includes("Unauthorized") || detail.includes("API key")) {
        return { success: false, error: "API key is invalid or missing. Please check your NVIDIA_API_KEY in apps/api/.env" };
      }
      return { success: false, error: `Server error: ${detail}` };
    }

    const data = await res.json();
    return data;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message.includes("fetch") || message.includes("Failed") || message.includes("ECONNREFUSED")) {
      return { success: false, error: "Cannot connect to the API server. Make sure the backend is running on port 3001." };
    }
    return { success: false, error: message };
  }
}

/* ─── Error Toast ─── */
function ErrorToast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
      transition={cinematic}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] max-w-lg w-full mx-4"
    >
      <div className="bg-[#2b1515] px-6 py-4 rounded-lg flex items-start gap-4 ambient-glow">
        <div className="shrink-0 mt-0.5">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffb4ab" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[#ffb4ab] mb-0.5">Something went wrong</p>
          <p className="text-xs text-[#d4c2c2] leading-relaxed">{message}</p>
        </div>
        <button onClick={onDismiss} className="shrink-0 text-[#9d8d8d] hover:text-[#e6e1e1] transition-colors duration-200 cursor-pointer" aria-label="Dismiss error">
          <CloseIcon />
        </button>
      </div>
    </motion.div>
  );
}

/* ─── "How it Works" Section ─── */
function HowItWorks() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  const steps = [
    {
      icon: <PenToolIcon />,
      step: "01",
      title: "Describe Your Idea",
      description: "Tell us about your startup concept, target audience, and the feeling you want your brand to evoke.",
    },
    {
      icon: <LayersIcon />,
      step: "02",
      title: "AI Synthesizes Identity",
      description: "Our intelligence engine analyzes millions of brand strategies to distill a unique, cohesive brand identity.",
    },
    {
      icon: <ZapIcon />,
      step: "03",
      title: "Export & Launch",
      description: "Download design tokens, visual assets, and a ready-to-deploy landing page preview — all in seconds.",
    },
  ];

  return (
    <section ref={ref} className="py-32 px-6 md:px-12 lg:px-20 relative overflow-hidden">
      {/* Subtle section glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-[#f1c0c0] opacity-[0.015] blur-[120px] pointer-events-none" aria-hidden="true" />
      <div className="max-w-6xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ ...cinematic, delay: 0.1 }}
          className="text-center mb-20"
        >
          <span className="inline-block text-[10px] uppercase tracking-[0.2em] text-[#9d8d8d] font-medium mb-4">The Process</span>
          <h2 className="font-[family-name:var(--font-newsreader)] text-3xl md:text-5xl font-light text-[#e6e1e1] tracking-tight">
            From idea to brand identity<br />in under a minute.
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {steps.map((step, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ ...cinematic, delay: 0.2 + idx * 0.15 }}
              className="group relative p-8 lg:p-10 rounded-2xl bg-[#1c1b1b] hover:bg-[#201f1f] transition-all duration-500 cursor-default card-elevated hover:translate-y-[-2px]"
            >
              {/* Step Number — top right */}
              <span className="absolute top-8 right-8 font-[family-name:var(--font-newsreader)] text-5xl font-light text-[#201f1f] group-hover:text-[#2b2a2a] transition-colors duration-300 select-none" aria-hidden="true">
                {step.step}
              </span>

              <div className="relative z-10">
                <div className="w-12 h-12 rounded-xl bg-[#201f1f] group-hover:bg-[#2b2a2a] flex items-center justify-center text-[#f1c0c0] mb-6 transition-colors duration-300">
                  {step.icon}
                </div>
                <h3 className="text-lg font-semibold text-[#e6e1e1] mb-3">{step.title}</h3>
                <p className="text-sm text-[#9d8d8d] leading-relaxed">{step.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Social Proof Bar ─── */
function SocialProofBar() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-40px" });

  return (
    <motion.section
      ref={ref}
      initial={{ opacity: 0 }}
      animate={isInView ? { opacity: 1 } : {}}
      transition={{ duration: 1 }}
      className="py-16 px-6 md:px-12 lg:px-20"
    >
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-center gap-12 md:gap-20">
        {[
          { value: "10", suffix: "k+", label: "Brands Generated" },
          { value: "<30", suffix: "s", label: "Avg. Generation Time" },
          { value: "4.9", suffix: "/5", label: "Creator Satisfaction" },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ ...cinematic, delay: 0.1 + i * 0.1 }}
            className="text-center"
          >
            <div className="font-[family-name:var(--font-newsreader)] text-3xl md:text-4xl font-light text-[#e6e1e1] mb-1 tabular-nums">
              <AnimatedCounter value={stat.value} suffix={stat.suffix} />
            </div>
            <div className="text-[11px] uppercase tracking-[0.15em] text-[#504444] font-medium">{stat.label}</div>
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
}

/* ─── Footer ─── */
function Footer() {
  return (
    <footer className="py-12 px-6 md:px-12 lg:px-20 bg-[#0f0e0e] relative">
      {/* Top border — gradient reveal */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#2b2a2a] to-transparent" />
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2">
          <span className="text-[#f1c0c0]"><SparkleIcon size={12} /></span>
          <span className="font-[family-name:var(--font-newsreader)] text-sm text-[#504444]">BrandOS</span>
          <span className="text-[#363434] mx-2">·</span>
          <span className="text-[11px] text-[#363434]">Cinematic Brand Intelligence</span>
        </div>
        <nav className="flex items-center gap-8">
          {["Privacy", "Terms", "GitHub"].map((link) => (
            <a key={link} href="#" className="text-[11px] uppercase tracking-[0.1em] text-[#504444] hover:text-[#9d8d8d] transition-colors duration-200 cursor-pointer">
              {link}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  );
}

/* ─── Main Component ─── */
export default function Home() {
  const [idea, setIdea] = useState("");
  const [loadingText, setLoadingText] = useState(false);
  const [loadingVisuals, setLoadingVisuals] = useState(false);
  const [vision, setVision] = useState<BrandVision>({});
  const [visuals, setVisuals] = useState<{ logoUrl?: string }>({});
  const [compileMode, setCompileMode] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [refining, setRefining] = useState(false);
  const [designTokens, setDesignTokens] = useState<DesignTokens | null>(null);
  const [loadingDesign, setLoadingDesign] = useState(false);
  const [designMode, setDesignMode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [navScrolled, setNavScrolled] = useState(false);

  const showError = useCallback((msg: string) => {
    setError(msg);
    setTimeout(() => setError(null), 8000);
  }, []);

  /* ─── Scroll-aware nav ─── */
  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 30);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* ─── API Handlers ─── */
  const handleGenerateText = async () => {
    if (!idea.trim()) return;
    setLoadingText(true);
    const res = await apiFetch<BrandVision>("/api/generate-brand", { idea });
    if (res.success && res.data) {
      setVision(res.data);
    } else {
      showError(res.error || "Failed to generate brand vision.");
    }
    setLoadingText(false);
  };

  const handleGenerateVisuals = async () => {
    if (!vision.brandName) return;
    setLoadingVisuals(true);
    const res = await apiFetch<{ logoUrl: string }>("/api/generate-visuals", {
      brandName: vision.brandName,
      visionStatement: vision.visionStatement,
    });
    if (res.success && res.data) {
      setVisuals(res.data);
    } else {
      showError(res.error || "Failed to generate visual identity.");
    }
    setLoadingVisuals(false);
  };

  const handleGenerateDesignSystem = async () => {
    if (!vision.brandName) return;
    setLoadingDesign(true);
    const res = await apiFetch<DesignTokens>("/api/generate-design-system", {
      brandName: vision.brandName,
      visionStatement: vision.visionStatement,
    });
    if (res.success && res.data) {
      setDesignTokens(res.data);
      setDesignMode(true);
    } else {
      showError(res.error || "Failed to generate design system.");
    }
    setLoadingDesign(false);
  };

  const handleRefine = async () => {
    if (!chatInput.trim() || !vision.brandName) return;
    const userMsg = chatInput.trim();
    setChatInput("");
    setChatMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setRefining(true);

    const res = await apiFetch<BrandVision>("/api/refine-brand", {
      currentVision: vision,
      instruction: userMsg,
    });
    if (res.success && res.data) {
      setVision(res.data);
      setChatMessages((prev) => [...prev, { role: "assistant", content: "Brand updated structurally." }]);
    } else {
      setChatMessages((prev) => [...prev, { role: "assistant", content: res.error || "Failed to refine brand." }]);
    }
    setRefining(false);
  };

  const handleExportTokens = () => {
    if (!designTokens || !vision.brandName) return;
    const exportData = {
      brand: vision.brandName,
      tagline: vision.tagline,
      vision: vision.visionStatement,
      designTokens,
    };
    const zip = new JSZip();
    zip.file("design-tokens.json", JSON.stringify(exportData, null, 2));
    zip.file("README.md", `# ${vision.brandName}\n\n> ${vision.tagline}\n\n${vision.visionStatement}\n\n---\nGenerated by BrandOS — AI-Powered Brand Identity Engine`);
    const safeName = (vision.brandName || "brand").replace(/\s+/g, "-").toLowerCase();
    zip.generateAsync({ type: "blob" }).then((content) => {
      saveAs(content, `${safeName}-brand-assets.zip`);
    });
  };

  const isHomeLanding = !vision.brandName && !compileMode && !designMode;

  /* ─── Render ─── */
  return (
    <div className="relative min-h-screen bg-[#141313] text-[#e6e1e1] flex flex-col grain-overlay">
      {/* Ambient orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0" aria-hidden="true">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-[#f1c0c0] opacity-[0.03] blur-[120px] orb-animate" />
        <div className="absolute -bottom-60 -left-40 w-[500px] h-[500px] rounded-full bg-[#d4a5a5] opacity-[0.02] blur-[100px] orb-animate" style={{ animationDelay: "-10s" }} />
      </div>

      {/* ─── Top Navigation ─── */}
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          navScrolled
            ? "glass-surface shadow-[0_1px_0_rgba(54,52,52,0.3)]"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-16 flex items-center justify-between h-16">
          <div className="flex items-center gap-2.5">
            <span className="text-[#f1c0c0]"><SparkleIcon size={14} /></span>
            <span className="font-[family-name:var(--font-newsreader)] text-lg tracking-tight text-[#d4c2c2]">BrandOS</span>
          </div>
          <div className="flex items-center gap-6">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#1c1b1b] ghost-border text-[9px] uppercase tracking-[0.15em] text-[#504444] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/70 pulse-live" />
              v1.0 — Live
            </span>
            {vision.brandName && (
              <button
                onClick={() => { setVision({}); setVisuals({}); setDesignMode(false); setCompileMode(false); setDesignTokens(null); }}
                className="text-[11px] uppercase tracking-[0.1em] text-[#9d8d8d] hover:text-[#e6e1e1] transition-colors duration-200 cursor-pointer font-medium"
              >
                New Brand
              </button>
            )}
          </div>
        </div>
      </motion.header>

      {/* Error Toast */}
      <AnimatePresence>
        {error && <ErrorToast message={error} onDismiss={() => setError(null)} />}
      </AnimatePresence>

      {/* ─── Main Content ─── */}
      <main className="flex-1 relative z-10 pt-16">
        <AnimatePresence mode="wait">
          {compileMode ? (
            /* ─── Compile Mode: Launch Page Preview ─── */
            <motion.div
              key="compileMode"
              initial={{ opacity: 0, scale: 0.96, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 30 }}
              transition={cinematic}
              className="w-full bg-[#141313] overflow-hidden relative"
            >
              {/* Back */}
              <motion.button
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3, ...cinematic }}
                onClick={() => setCompileMode(false)}
                className="fixed top-20 right-8 z-50 flex items-center gap-2 px-4 py-2.5 bg-[#201f1f]/80 backdrop-blur-xl text-[#d4c2c2] rounded-lg text-sm font-medium hover:bg-[#2b2a2a] transition-colors duration-200 cursor-pointer"
              >
                <ChevronLeftIcon /> Back to Editor
              </motion.button>

              {/* Navbar */}
              <header className="flex justify-between items-center px-8 lg:px-16 py-6 bg-[#1c1b1b]">
                <div className="flex items-center gap-3">
                  {visuals.logoUrl && <img src={visuals.logoUrl} alt={`${vision.brandName} logo`} className="w-8 h-8 object-contain rounded" />}
                  <span className="font-[family-name:var(--font-newsreader)] text-xl tracking-tight text-[#e6e1e1]">{vision.brandName}</span>
                </div>
                <nav className="hidden md:flex gap-8 text-sm font-medium text-[#9d8d8d]">
                  <a href="#" className="hover:text-[#f1c0c0] transition-colors duration-200 cursor-pointer">Product</a>
                  <a href="#" className="hover:text-[#f1c0c0] transition-colors duration-200 cursor-pointer">Features</a>
                  <a href="#" className="hover:text-[#f1c0c0] transition-colors duration-200 cursor-pointer">Pricing</a>
                </nav>
                <button className="px-5 py-2.5 bg-gradient-to-br from-[#f1c0c0] to-[#d4a5a5] text-[#472829] rounded-md font-semibold text-sm hover:shadow-[0_0_20px_rgba(241,192,192,0.2)] transition-all duration-200 cursor-pointer">
                  Get Started
                </button>
              </header>

              {/* Hero */}
              <section className="px-8 lg:px-16 py-28 md:py-40 flex flex-col items-center text-center relative">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-[#f1c0c0] opacity-[0.04] blur-[120px] pointer-events-none" />
                <motion.h1
                  variants={fadeUp} initial="hidden" animate="visible"
                  className="text-5xl md:text-7xl lg:text-8xl font-[family-name:var(--font-newsreader)] font-light tracking-tight leading-[1.05] text-[#e6e1e1] max-w-4xl mb-8"
                >
                  {vision.tagline || "Redefining the standard."}
                </motion.h1>
                <motion.p
                  variants={fadeUp} initial="hidden" animate="visible"
                  transition={{ delay: 0.1 }}
                  className="text-lg md:text-xl text-[#9d8d8d] max-w-2xl mb-12 leading-relaxed"
                >
                  {vision.visionStatement}
                </motion.p>
                <motion.div variants={fadeUp} initial="hidden" animate="visible" transition={{ delay: 0.2 }} className="flex gap-4">
                  <button className="px-8 py-4 bg-gradient-to-br from-[#f1c0c0] to-[#d4a5a5] text-[#472829] rounded-lg font-semibold text-lg hover:shadow-[0_0_30px_rgba(241,192,192,0.25)] transition-all duration-200 cursor-pointer">
                    Start Free Trial
                  </button>
                  <button className="px-8 py-4 rounded-lg font-semibold text-lg text-[#e6e1e1] bg-[#201f1f] hover:bg-[#2b2a2a] transition-all duration-200 cursor-pointer">
                    View Demo
                  </button>
                </motion.div>

                {/* Mockup */}
                <motion.div
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, ...cinematic }}
                  className="mt-20 w-full max-w-4xl aspect-[16/9] rounded-xl bg-[#1c1b1b] flex items-center justify-center overflow-hidden relative"
                >
                  <div className="absolute inset-x-0 top-0 h-8 bg-[#141313] flex items-center px-4 gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#363434]" />
                    <div className="w-2.5 h-2.5 rounded-full bg-[#363434]" />
                    <div className="w-2.5 h-2.5 rounded-full bg-[#363434]" />
                  </div>
                  {visuals.logoUrl && <img src={visuals.logoUrl} alt="Product preview" className="w-32 h-32 opacity-20 object-contain grayscale" />}
                </motion.div>
              </section>

              {/* Features */}
              <section className="px-8 lg:px-16 py-24 bg-[#1c1b1b]">
                <div className="max-w-6xl mx-auto">
                  <h2 className="text-3xl md:text-4xl font-[family-name:var(--font-newsreader)] text-[#e6e1e1] mb-16 text-center">
                    Why {vision.brandName}?
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {vision.valueProps?.map((prop, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: idx * 0.1, ...cinematic }}
                        className="p-8 rounded-xl bg-[#201f1f] hover:bg-[#2b2a2a] transition-colors duration-300 cursor-default group"
                      >
                        <div className="text-[#f1c0c0] font-bold text-xl mb-4 font-[family-name:var(--font-newsreader)]">0{idx + 1}.</div>
                        <h3 className="text-[#e6e1e1] text-lg font-semibold mb-3">{prop.title}</h3>
                        <p className="text-[#9d8d8d] leading-relaxed text-sm">{prop.description}</p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </section>
            </motion.div>

          ) : designMode && designTokens ? (
            /* ─── Design System Dashboard ─── */
            <motion.div
              key="designMode"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              transition={cinematic}
              className="w-full max-w-6xl mx-auto flex flex-col gap-16 px-6 md:px-12 lg:px-20 py-20"
            >
              {/* Back */}
              <motion.button
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={() => setDesignMode(false)}
                className="fixed top-20 right-8 z-50 flex items-center gap-2 px-4 py-2.5 bg-[#201f1f]/80 backdrop-blur-xl text-[#d4c2c2] rounded-lg text-sm font-medium hover:bg-[#2b2a2a] transition-colors duration-200 cursor-pointer"
              >
                <ChevronLeftIcon /> Back
              </motion.button>

              {/* Header */}
              <motion.div variants={stagger} initial="hidden" animate="visible" className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 pb-8">
                <motion.div variants={fadeUp} className="flex flex-col gap-2">
                  <h1 className="font-[family-name:var(--font-newsreader)] text-4xl md:text-5xl text-[#e6e1e1] tracking-tight">{vision.brandName}</h1>
                  <p className="text-[11px] tracking-[0.2em] uppercase text-[#9d8d8d] font-medium">Brand Guidelines System</p>
                </motion.div>
                <motion.button
                  variants={fadeUp}
                  onClick={handleExportTokens}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-br from-[#f1c0c0] to-[#d4a5a5] text-[#472829] font-semibold rounded-lg hover:shadow-[0_0_20px_rgba(241,192,192,0.2)] transition-all duration-200 cursor-pointer"
                >
                  <DownloadIcon /> Export Tokens
                </motion.button>
              </motion.div>

              <div className="w-full h-px bg-gradient-to-r from-transparent via-[#363434] to-transparent" />

              {/* Tokens Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-20">
                {/* Color Palette */}
                <motion.div variants={stagger} initial="hidden" animate="visible" className="flex flex-col gap-8">
                  <motion.h2 variants={fadeUp} className="font-[family-name:var(--font-newsreader)] text-2xl text-[#d4c2c2]">Obsidian &amp; Glow Palette</motion.h2>
                  <div className="flex flex-col gap-4">
                    {[
                      { label: "Primary", value: designTokens.colors?.primary || "#f1c0c0" },
                      { label: "Secondary", value: designTokens.colors?.secondary || "#d4a5a5" },
                      { label: "Background Void", value: designTokens.colors?.background || "#141313" },
                    ].map((color) => (
                      <motion.div key={color.label} variants={fadeUp} className="flex gap-4 items-center bg-[#1c1b1b] p-5 rounded-xl relative group hover:bg-[#201f1f] transition-colors duration-200 cursor-default">
                        <div className="absolute left-0 top-0 bottom-0 w-1.5 rounded-l-xl transition-all duration-200" style={{ backgroundColor: color.value }} />
                        <div className="w-14 h-14 rounded-full shrink-0" style={{ backgroundColor: color.value }} />
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[10px] uppercase tracking-[0.15em] text-[#9d8d8d] font-medium">{color.label}</span>
                          <span className="font-mono text-sm text-[#e6e1e1]">{color.value}</span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>

                {/* Typography & UI */}
                <motion.div variants={stagger} initial="hidden" animate="visible" className="flex flex-col gap-12">
                  <div className="flex flex-col gap-6">
                    <motion.h2 variants={fadeUp} className="font-[family-name:var(--font-newsreader)] text-2xl text-[#d4c2c2]">Editorial Authority</motion.h2>
                    <motion.div variants={fadeUp} className="bg-[#1c1b1b] p-8 rounded-xl flex flex-col gap-6 relative overflow-hidden">
                      <div className="absolute -top-12 -right-12 text-[150px] font-[family-name:var(--font-newsreader)] text-[#201f1f] select-none pointer-events-none leading-none" aria-hidden="true">A</div>
                      <div className="flex flex-col gap-1.5 relative z-10">
                        <span className="text-[10px] uppercase tracking-[0.15em] text-[#f1c0c0] font-medium">Heading Scale</span>
                        <span className="font-[family-name:var(--font-newsreader)] text-4xl text-[#e6e1e1]">{designTokens.typography?.heading || "Newsreader"}</span>
                        <span className="text-sm text-[#9d8d8d]">Use for core brand pillars and primary logic.</span>
                      </div>
                      <div className="w-full h-px bg-gradient-to-r from-[#363434] to-transparent" />
                      <div className="flex flex-col gap-1.5 relative z-10">
                        <span className="text-[10px] uppercase tracking-[0.15em] text-[#f1c0c0] font-medium">Body Scale</span>
                        <span className="text-2xl text-[#d4c2c2]">{designTokens.typography?.body || "Manrope"}</span>
                        <span className="text-sm text-[#9d8d8d]">The functional intelligence workhorse.</span>
                      </div>
                    </motion.div>
                  </div>

                  <div className="flex flex-col gap-4">
                    <h3 className="text-[10px] uppercase tracking-[0.15em] text-[#9d8d8d] font-medium">UI Elements Preview</h3>
                    <motion.div variants={fadeUp} className="flex flex-wrap gap-4 items-center p-8 bg-[#201f1f] rounded-xl">
                      <button
                        className="px-6 py-2.5 font-semibold text-sm hover:opacity-90 transition-opacity duration-200 rounded cursor-pointer"
                        style={{
                          background: `linear-gradient(135deg, ${designTokens.colors?.primary || "#f1c0c0"}, ${designTokens.colors?.secondary || "#d4a5a5"})`,
                          color: designTokens.colors?.background || "#141313",
                          borderRadius: designTokens.rules?.borderRadius || "6px",
                        }}
                      >
                        Primary Interaction
                      </button>
                      <input
                        type="text"
                        placeholder="Insight Slot"
                        style={{ borderRadius: designTokens.rules?.borderRadius || "6px" }}
                        className="bg-[#2b2a2a] text-[#e6e1e1] placeholder-[#504444] outline-none px-4 py-2.5 text-sm focus:bg-[#363434] transition-colors duration-200"
                        aria-label="Design token preview input"
                      />
                      <div className="w-full text-xs text-[#504444] font-mono mt-2">
                        radius: {designTokens.rules?.borderRadius} / spacing: {designTokens.rules?.spacing}
                      </div>
                    </motion.div>
                  </div>
                </motion.div>
              </div>
            </motion.div>

          ) : (
            /* ─── Normal Mode: Home ─── */
            <motion.div
              key="normalMode"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -20 }}
              transition={cinematic}
            >
              {/* Hero Area */}
              <section className={`w-full flex flex-col lg:flex-row gap-12 lg:gap-20 relative z-10 ${visuals.logoUrl ? "max-w-7xl" : "max-w-5xl"} mx-auto items-center min-h-[calc(100vh-4rem)] justify-center px-6 md:px-12 lg:px-20 py-16`}>
                {/* Left: Editorial Headline */}
                <motion.div
                  variants={stagger}
                  initial="hidden"
                  animate="visible"
                  className={`flex flex-col justify-center ${visuals.logoUrl ? "lg:w-[35%]" : "lg:w-[45%]"}`}
                >
                  <motion.div variants={fadeUp} className="mb-6">
                    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1c1b1b] ghost-border text-[10px] uppercase tracking-[0.15em] text-[#9d8d8d] font-medium shimmer">
                      <SparkleIcon size={10} />
                      AI-Powered Brand Engine
                    </span>
                  </motion.div>

                  <motion.h1
                    variants={fadeUp}
                    className="font-[family-name:var(--font-newsreader)] text-5xl md:text-6xl lg:text-7xl font-light tracking-tight leading-[1.05] mb-8 text-[#e6e1e1] text-render-crisp"
                  >
                    {!vision.brandName ? (
                      <>What are<br />you building?</>
                    ) : (
                      <span className="gradient-text">{vision.brandName}</span>
                    )}
                  </motion.h1>

                  {!vision.brandName ? (
                    <motion.p variants={fadeUp} className="text-[#9d8d8d] text-base md:text-lg leading-relaxed max-w-md">
                      Describe your idea, target audience, and vision. Our intelligence engine will distill it into a cohesive startup-ready brand.
                    </motion.p>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={cinematic}
                      className="flex flex-col gap-5"
                    >
                      <h3 className="text-xl md:text-2xl font-[family-name:var(--font-newsreader)] font-light text-[#e6e1e1]">{vision.tagline}</h3>
                      <p className="text-sm leading-relaxed text-[#9d8d8d] pl-5 py-1 relative before:absolute before:left-0 before:top-0 before:bottom-0 before:w-px before:bg-gradient-to-b before:from-[#f1c0c0] before:to-transparent">
                        {vision.visionStatement}
                      </p>
                      {vision.valueProps && (
                        <motion.div variants={stagger} initial="hidden" animate="visible" className="flex flex-col gap-3 mt-3">
                          {vision.valueProps.map((prop, i) => (
                            <motion.div key={i} variants={fadeUp} className="flex items-start gap-3">
                              <span className="text-[#f1c0c0] text-xs font-bold mt-0.5 shrink-0">0{i + 1}</span>
                              <p className="text-xs text-[#d4c2c2] leading-relaxed"><strong className="text-[#e6e1e1]">{prop.title}</strong> — {prop.description}</p>
                            </motion.div>
                          ))}
                        </motion.div>
                      )}
                    </motion.div>
                  )}
                </motion.div>

                {/* Right: Interaction Stage */}
                <div className={`flex flex-col gap-6 w-full ${visuals.logoUrl ? "lg:w-[65%]" : "lg:w-[55%]"}`}>
                  <AnimatePresence mode="wait">
                    {!vision.brandName ? (
                      /* Phase 1: Input */
                      <motion.div
                        key="phase1"
                        variants={stagger}
                        initial="hidden"
                        animate="visible"
                        exit={{ opacity: 0, y: -10 }}
                      >
                        <motion.div variants={fadeUp} className="relative group w-full mb-6">
                          <div className="bg-[#1c1b1b] rounded-2xl overflow-hidden group-focus-within:bg-[#1e1d1d] transition-all duration-300 group-focus-within:shadow-[0_0_0_1px_rgba(241,192,192,0.1),0_0_30px_rgba(241,192,192,0.03)] card-elevated">
                            <div className="px-6 pt-5 pb-2 flex items-center justify-between">
                              <label htmlFor="idea-input" className="text-[11px] uppercase tracking-[0.15em] text-[#f1c0c0] font-semibold">
                                Your Vision
                              </label>
                              <span className={`text-[10px] font-mono transition-colors duration-200 ${idea.length > 400 ? "text-[#ffb4ab]" : "text-[#363434]"}`}>
                                {idea.length}/500
                              </span>
                            </div>
                            <textarea
                              id="idea-input"
                              value={idea}
                              onChange={(e) => { if (e.target.value.length <= 500) setIdea(e.target.value); }}
                              onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleGenerateText(); }}
                              className="w-full h-48 bg-transparent resize-none px-6 pb-6 text-base outline-none placeholder:text-[#5a4d4d] text-[#e6e1e1] leading-relaxed"
                              placeholder="e.g. A premium matchmaking app for cinephiles who believe that the movies you love reveal who you truly are..."
                            />
                          </div>
                        </motion.div>

                        <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                          <motion.button
                            onClick={handleGenerateText}
                            disabled={loadingText || !idea.trim()}
                            whileHover={{ scale: 1.015 }}
                            whileTap={{ scale: 0.985 }}
                            className="group relative px-8 py-4 bg-gradient-to-br from-[#f1c0c0] to-[#d4a5a5] text-[#472829] rounded-xl font-semibold text-base hover:shadow-[0_0_40px_rgba(241,192,192,0.25)] transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-3 btn-press"
                          >
                            {loadingText ? <LoadingSpinner /> : <SparkleIcon size={14} />}
                            {loadingText ? "Analyzing your vision..." : "Generate Brand Vision"}
                            {!loadingText && (
                              <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                <ArrowRightIcon />
                              </span>
                            )}
                          </motion.button>

                          <span className="text-[10px] text-[#504444] hidden sm:inline">
                            or press <kbd className="px-1.5 py-0.5 bg-[#1c1b1b] rounded text-[#9d8d8d] font-mono">⌘</kbd> + <kbd className="px-1.5 py-0.5 bg-[#1c1b1b] rounded text-[#9d8d8d] font-mono">Enter</kbd>
                          </span>
                        </motion.div>
                      </motion.div>

                    ) : !visuals.logoUrl ? (
                      /* Phase 2: Ready for Visuals */
                      <motion.div
                        key="phase2-wait"
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.96 }}
                        transition={cinematic}
                        className="flex flex-col items-center justify-center min-h-[350px] gap-8 bg-[#1c1b1b] rounded-2xl p-12 relative card-elevated"
                      >
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] h-[200px] bg-[#f1c0c0] opacity-[0.03] blur-[80px] pointer-events-none" />
                        <div className="text-center">
                          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200, damping: 15 }} className="w-16 h-16 rounded-2xl bg-[#201f1f] flex items-center justify-center mx-auto mb-6">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f1c0c0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                            </svg>
                          </motion.div>
                          <h3 className="text-xl font-[family-name:var(--font-newsreader)] font-light text-[#e6e1e1] mb-2">Brand strategy synthesized.</h3>
                          <p className="text-sm text-[#9d8d8d]">Let&apos;s generate the visual identity to match.</p>
                        </div>
                        <motion.button
                          onClick={handleGenerateVisuals}
                          disabled={loadingVisuals}
                          whileHover={{ scale: 1.015 }}
                          whileTap={{ scale: 0.985 }}
                          className="px-8 py-4 bg-gradient-to-br from-[#f1c0c0] to-[#d4a5a5] text-[#472829] rounded-xl font-semibold text-base hover:shadow-[0_0_30px_rgba(241,192,192,0.2)] transition-all duration-300 disabled:opacity-40 cursor-pointer flex items-center gap-3"
                        >
                          {loadingVisuals ? <LoadingSpinner /> : (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
                            </svg>
                          )}
                          {loadingVisuals ? "Rendering pixels..." : "Generate Visual Identity"}
                        </motion.button>
                      </motion.div>

                    ) : (
                      /* Phase 2: Generated Visuals Dashboard */
                      <motion.div
                        key="phase2-done"
                        variants={stagger}
                        initial="hidden"
                        animate="visible"
                        exit={{ opacity: 0 }}
                        className="grid grid-cols-1 md:grid-cols-2 gap-6"
                      >
                        {/* Logo Card */}
                        <motion.div
                          variants={scaleIn}
                          className="group relative rounded-2xl overflow-hidden bg-[#1c1b1b] aspect-square flex items-center justify-center p-8 card-elevated hover:translate-y-[-2px] transition-transform duration-500"
                        >
                          <img
                            src={visuals.logoUrl}
                            alt={`Logo concept for ${vision.brandName}`}
                            className="w-full h-full object-contain rounded-lg drop-shadow-2xl transition-transform duration-700 ease-out group-hover:scale-105"
                          />
                          <div className="absolute bottom-4 left-4 bg-[#141313]/80 backdrop-blur-md px-3 py-1.5 rounded text-[10px] font-bold tracking-[0.15em] uppercase text-[#9d8d8d]">
                            Primary Mark
                          </div>
                        </motion.div>

                        {/* Typography & Colors Card */}
                        <motion.div variants={scaleIn} className="relative rounded-2xl bg-[#1c1b1b] aspect-square flex flex-col p-8 card-elevated">
                          <div className="flex-1 flex flex-col gap-4">
                            <h3 className="text-[10px] font-bold tracking-[0.15em] uppercase text-[#504444]">Brand Palette</h3>
                            <div className="flex gap-2 h-16 w-full">
                              <div className="flex-1 bg-[#141313] rounded-lg" />
                              <div className="flex-1 bg-[#f1c0c0] rounded-lg" />
                              <div className="flex-1 bg-[#2C4159] rounded-lg" />
                              <div className="flex-1 bg-[#e6e1e1] rounded-lg" />
                            </div>
                          </div>
                          <div className="flex-1 flex flex-col justify-end gap-2 pt-6 mt-4">
                            <h3 className="text-[10px] font-bold tracking-[0.15em] uppercase text-[#504444]">Typography System</h3>
                            <div className="text-3xl font-[family-name:var(--font-newsreader)] text-[#e6e1e1]">Newsreader</div>
                            <div className="text-lg text-[#9d8d8d]">Manrope</div>
                          </div>
                        </motion.div>

                        {/* Actions Bar */}
                        <motion.div variants={fadeUp} className="col-span-1 md:col-span-2 flex flex-col sm:flex-row justify-between items-center gap-4 pt-6">
                          <button
                            className="text-[#9d8d8d] hover:text-[#e6e1e1] text-xs uppercase tracking-[0.15em] font-bold transition-colors duration-200 cursor-pointer"
                            onClick={() => setVisuals({})}
                          >
                            Regenerate Visuals
                          </button>
                          <div className="flex gap-3">
                            <button
                              onClick={handleGenerateDesignSystem}
                              disabled={loadingDesign}
                              className="px-5 py-3 bg-[#201f1f] text-[#e6e1e1] rounded-lg font-medium text-sm hover:bg-[#2b2a2a] transition-colors duration-200 disabled:opacity-40 cursor-pointer flex items-center gap-2"
                            >
                              {loadingDesign && <LoadingSpinner />}
                              {loadingDesign ? "Generating tokens..." : "View Design System"}
                            </button>
                            <button
                              onClick={() => setCompileMode(true)}
                              className="px-5 py-3 bg-gradient-to-br from-[#f1c0c0] to-[#d4a5a5] text-[#472829] rounded-lg font-semibold text-sm hover:shadow-[0_0_20px_rgba(241,192,192,0.2)] transition-all duration-200 cursor-pointer flex items-center gap-2 btn-press"
                            >
                              Compile Launch Page
                              <ArrowRightIcon />
                            </button>
                          </div>
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </section>

              {/* Below-the-fold sections — only on landing state */}
              {isHomeLanding && (
                <>
                  {/* Divider */}
                  <div className="w-full max-w-6xl mx-auto px-6 md:px-12 lg:px-20">
                    <div className="h-px bg-gradient-to-r from-transparent via-[#2b2a2a] to-transparent" />
                  </div>

                  <SocialProofBar />

                  <div className="w-full max-w-6xl mx-auto px-6 md:px-12 lg:px-20">
                    <div className="h-px bg-gradient-to-r from-transparent via-[#2b2a2a] to-transparent" />
                  </div>

                  <HowItWorks />

                  {/* Bottom CTA */}
                  <section className="py-24 px-6 md:px-12 lg:px-20 relative">
                    <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-[#f1c0c0] opacity-[0.03] blur-[100px]" />
                    </div>
                    <motion.div
                      initial={{ opacity: 0, y: 30 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={cinematic}
                      className="max-w-2xl mx-auto text-center relative z-10"
                    >
                      <h2 className="font-[family-name:var(--font-newsreader)] text-3xl md:text-5xl font-light text-[#e6e1e1] tracking-tight mb-6">
                        Ready to define<br />your brand?
                      </h2>
                      <p className="text-[#9d8d8d] mb-10 leading-relaxed">
                        Join thousands of founders who trust BrandOS to distill their raw vision into a launch-ready identity.
                      </p>
                      <motion.button
                        whileHover={{ scale: 1.015 }}
                        whileTap={{ scale: 0.985 }}
                        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                        className="px-10 py-4 bg-gradient-to-br from-[#f1c0c0] to-[#d4a5a5] text-[#472829] rounded-xl font-semibold text-base hover:shadow-[0_0_40px_rgba(241,192,192,0.25)] transition-all duration-300 cursor-pointer inline-flex items-center gap-3 btn-press"
                      >
                        <SparkleIcon size={14} />
                        Start Building
                        <ArrowRightIcon />
                      </motion.button>
                    </motion.div>
                  </section>

                  <Footer />
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* ─── Strategy AI Chat Widget ─── */}
      {vision.brandName && (
        <div className="fixed bottom-8 right-8 z-50 flex flex-col items-end">
          <AnimatePresence mode="wait">
            {chatOpen ? (
              <motion.div
                key="chatWindow"
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.9 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="w-80 h-[420px] bg-[#1c1b1b]/95 backdrop-blur-xl rounded-2xl shadow-2xl flex flex-col overflow-hidden ambient-glow"
              >
                <div className="bg-[#201f1f] px-5 py-4 flex justify-between items-center">
                  <h3 className="text-[#e6e1e1] font-semibold text-sm flex items-center gap-2">
                    <span className="text-[#f1c0c0]"><SparkleIcon size={12} /></span>
                    Strategy AI
                  </h3>
                  <button onClick={() => setChatOpen(false)} className="text-[#9d8d8d] hover:text-[#e6e1e1] transition-colors duration-200 cursor-pointer" aria-label="Close chat">
                    <CloseIcon />
                  </button>
                </div>
                <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-3">
                  <div className="bg-[#201f1f] text-[#d4c2c2] text-sm p-3 rounded-xl self-start max-w-[85%] leading-relaxed">
                    How can I help refine your brand? Try: <em>&ldquo;Make my tagline more aggressive&rdquo;</em>
                  </div>
                  {chatMessages.map((msg, i) => (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      key={i}
                      className={`text-sm p-3 rounded-xl max-w-[85%] leading-relaxed ${
                        msg.role === "user"
                          ? "bg-gradient-to-r from-[#f1c0c0] to-[#d4a5a5] text-[#472829] self-end"
                          : "bg-[#201f1f] text-[#d4c2c2] self-start"
                      }`}
                    >
                      {msg.content}
                    </motion.div>
                  ))}
                  {refining && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-[#201f1f] text-[#9d8d8d] text-sm p-3 rounded-xl self-start max-w-[85%]">
                      <div className="flex items-center gap-2">
                        <LoadingSpinner />
                        <span>Refining architecture...</span>
                      </div>
                    </motion.div>
                  )}
                </div>
                <div className="p-3 bg-[#141313] flex gap-2 items-center">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleRefine()}
                    placeholder="Direct the AI..."
                    className="bg-[#201f1f] text-[#e6e1e1] text-sm rounded-lg px-4 py-3 flex-1 outline-none focus:bg-[#2b2a2a] transition-colors duration-200 placeholder:text-[#504444]"
                    aria-label="Chat input"
                  />
                  <button
                    onClick={handleRefine}
                    disabled={refining || !chatInput.trim()}
                    className="bg-gradient-to-br from-[#f1c0c0] to-[#d4a5a5] text-[#472829] w-10 h-10 rounded-lg flex items-center justify-center hover:shadow-[0_0_15px_rgba(241,192,192,0.2)] transition-all duration-200 disabled:opacity-40 cursor-pointer"
                    aria-label="Send message"
                  >
                    <ArrowUpIcon />
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.button
                key="chatToggle"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                onClick={() => setChatOpen(true)}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.95 }}
                className="w-14 h-14 bg-gradient-to-br from-[#f1c0c0] to-[#d4a5a5] rounded-full shadow-[0_0_30px_rgba(241,192,192,0.2)] flex items-center justify-center cursor-pointer"
                aria-label="Open Strategy AI chat"
              >
                <span className="text-[#472829]"><SparkleIcon /></span>
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
