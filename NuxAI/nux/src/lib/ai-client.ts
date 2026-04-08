import OpenAI from "openai";

const NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1";
const NVIDIA_DEFAULT_MODEL = "meta/llama-3.1-8b-instruct";

export interface AIClientConfig {
  client: OpenAI;
  model: string;
  visionModel: string;
  provider: "openai" | "nvidia";
}

export function getAIClientConfig(apiKey: string): AIClientConfig {
  const explicitBaseURL = process.env.OPENAI_BASE_URL?.trim();
  const useNvidia = !explicitBaseURL && apiKey.startsWith("nvapi-");

  const provider: "openai" | "nvidia" = useNvidia ? "nvidia" : "openai";
  const baseURL = explicitBaseURL || (useNvidia ? NVIDIA_BASE_URL : undefined);

  const client = new OpenAI({ apiKey, baseURL });

  const requestedModel = process.env.OPENAI_MODEL?.trim();
  const requestedVisionModel = process.env.OPENAI_VISION_MODEL?.trim();

  const looksLikeOpenAIOnlyModel = (value?: string): boolean => {
    if (!value) {
      return false;
    }
    return /^gpt-|^o\d|^omni/i.test(value);
  };

  const model =
    useNvidia && looksLikeOpenAIOnlyModel(requestedModel)
      ? NVIDIA_DEFAULT_MODEL
      : requestedModel || (useNvidia ? NVIDIA_DEFAULT_MODEL : "gpt-4.1-mini");

  const visionModel =
    useNvidia && looksLikeOpenAIOnlyModel(requestedVisionModel || requestedModel)
      ? NVIDIA_DEFAULT_MODEL
      : requestedVisionModel || requestedModel || (useNvidia ? NVIDIA_DEFAULT_MODEL : "gpt-4.1-mini");

  return { client, model, visionModel, provider };
}
