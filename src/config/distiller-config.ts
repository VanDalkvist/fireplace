export interface DistillerConfig {
  defaultEngine: "openrouter" | "ollama";
  openrouter: {
    model: string;
    baseUrl: string;
    timeoutMs: number;
    apiKey?: string;
  };
  ollama: {
    model: string;
    baseUrl: string;
    timeoutMs: number;
  };
}

export function getDistillerConfig(): DistillerConfig {
  let modelOverride = "";
  let engineOverride: "openrouter" | "ollama" | "" = "";

  if (typeof window !== "undefined") {
    const urlParams = new URLSearchParams(window.location.search);
    const urlModel = urlParams.get("distiller_model");
    const urlEngine = urlParams.get("distiller_engine");
    const localModel = localStorage.getItem("salon_distiller_model");
    const localEngine = localStorage.getItem("salon_distiller_engine");

    modelOverride = urlModel || localModel || "";
    if (urlEngine === "openrouter" || urlEngine === "ollama") engineOverride = urlEngine;
    else if (localEngine === "openrouter" || localEngine === "ollama") engineOverride = localEngine;
  }

  return {
    defaultEngine: engineOverride || "openrouter",
    openrouter: {
      model: modelOverride || "openrouter/free",
      baseUrl: "/api/openrouter",
      timeoutMs: 8000,
    },
    ollama: {
      model: (engineOverride === "ollama" && modelOverride) ? modelOverride : "qwen2.5:1.5b",
      baseUrl: "http://127.0.0.1:11434",
      timeoutMs: 4500,
    },
  };
}
