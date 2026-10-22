import { useState } from "react";
import type { SpeechEngineKind } from "@/speech/speech-types";

export function useSalonUiState() {
  const isVoiceInit = typeof window !== "undefined" && window.location.search.includes("voice=1");
  const [isPultOpen, setIsPultOpen] = useState(false);
  const [isIntroOpen, setIsIntroOpen] = useState(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [isZen, setIsZen] = useState(false);
  const [volume, setVolume] = useState(0.6);
  const [sttEngine, setSttEngine] = useState<SpeechEngineKind>(() => {
    if (typeof window === "undefined") return "gigaam";
    if (window.location.search.includes("stt=google")) return "google";
    if (window.location.search.includes("stt=whisper")) return "whisper";
    return "gigaam";
  });
  const [isDemoActive, setIsDemoActive] = useState(() =>
    typeof window !== "undefined" && window.location.search.includes("demo=1")
  );
  const [isVerbatimMode, setIsVerbatimModeState] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    if (window.location.search.includes("verbatim=1")) return true;
    return localStorage.getItem("salon_verbatim_mode") === "true";
  });

  const [distillerEngine, setDistillerEngineState] = useState<"openrouter" | "ollama">(() => {
    if (typeof window === "undefined") return "openrouter";
    const urlEngine = new URLSearchParams(window.location.search).get("distiller_engine");
    if (urlEngine === "ollama" || urlEngine === "openrouter") return urlEngine;
    const local = localStorage.getItem("salon_distiller_engine");
    if (local === "ollama" || local === "openrouter") return local;
    return "openrouter";
  });

  const toggleDistillerEngine = () => {
    setDistillerEngineState((prev) => {
      const next = prev === "openrouter" ? "ollama" : "openrouter";
      if (typeof window !== "undefined") {
        localStorage.setItem("salon_distiller_engine", next);
      }
      return next;
    });
  };

  const setIsVerbatimMode = (val: boolean | ((prev: boolean) => boolean)) => {
    setIsVerbatimModeState((prev) => {
      const next = typeof val === "function" ? val(prev) : val;
      if (typeof window !== "undefined") {
        localStorage.setItem("salon_verbatim_mode", String(next));
      }
      return next;
    });
  };

  return {
    isVoiceInit,
    isPultOpen,
    setIsPultOpen,
    isIntroOpen,
    setIsIntroOpen,
    isAnalyticsOpen,
    setIsAnalyticsOpen,
    isZen,
    setIsZen,
    isVerbatimMode,
    setIsVerbatimMode,
    volume,
    setVolume,
    sttEngine,
    setSttEngine,
    distillerEngine,
    toggleDistillerEngine,
    isDemoActive,
    setIsDemoActive,
  };
}
