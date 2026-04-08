export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
}

export interface ChatThread {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  pinned?: boolean;
  archived?: boolean;
  messages: ChatMessage[];
}

export interface ImageAnalysisResult {
  likelySubstance: string;
  confidence: number;
  summary: string;
  risks: string[];
  redFlags: string[];
  disclaimer: string;
}
