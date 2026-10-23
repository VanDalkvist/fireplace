export const BUILTIN_DISTILLERS = ["openrouter", "ollama", "pi"] as const;
export interface DistillerConfig {
  defaultEngine: string;
  openrouter: { model: string; baseUrl: string; timeoutMs: number; apiKey?: string };
  ollama: { model: string; baseUrl: string; timeoutMs: number };
  pi: { model: string; baseUrl: string; timeoutMs: number };
  fallbacks: Record<string, string[]>;
  segmenterChain: string[];
}

export function getDistillerConfig(): DistillerConfig {
  const params = typeof window === "undefined" ? new URLSearchParams() : new URLSearchParams(window.location.search);
  const saved = (key: string) => typeof window === "undefined" ? null : localStorage.getItem(key);
  const engine = params.get("distiller_engine") || saved("salon_distiller_engine") || "openrouter";
  const model = params.get("distiller_model") || saved("salon_distiller_model");
  return {
    defaultEngine: engine,
    openrouter: { model: engine === "openrouter" && model ? model : "nvidia/nemotron-3.5-lightning:free", baseUrl: "/api/openrouter", timeoutMs: 8000 },
    ollama: { model: engine === "ollama" && model ? model : "qwen2.5:1.5b", baseUrl: "http://127.0.0.1:11434", timeoutMs: 4500 },
    pi: { model: (params.get("distiller_engine") === "pi" ? params.get("distiller_model") : null) || saved("salon_distiller_pi_model") || "gpt-6-luna", baseUrl: "/api/pi", timeoutMs: 12000 },
    // Empty chains mean NO automatic provider switching. Only decorators may consume these entries.
    fallbacks: { openrouter: [], ollama: [], pi: [] },
    segmenterChain: ["ollama", "lossless"],
  };
}
