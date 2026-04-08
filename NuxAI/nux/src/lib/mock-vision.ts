import type { ImageAnalysisResult } from "@/types/chat";

const DEFAULT_DISCLAIMER =
  "Image-based identification is uncertain. Never rely on visual appearance alone; use reagent testing and local medical guidance.";

export function mockImageAnalysis(): ImageAnalysisResult {
  return {
    likelySubstance: "Unverified tablet/powder sample",
    confidence: 0.36,
    summary:
      "Visual cues are not enough for reliable identification. Multiple different compounds can look identical.",
    risks: [
      "Unknown potency may increase overdose risk",
      "Unexpected adulterants can change effects",
      "Mixing with alcohol, opioids, or benzodiazepines can increase respiratory danger",
    ],
    redFlags: [
      "Breathing becomes slow, noisy, or pauses",
      "Chest pain, severe agitation, seizure, or high body temperature",
      "Unresponsiveness or blue/gray lips",
    ],
    disclaimer: DEFAULT_DISCLAIMER,
  };
}
