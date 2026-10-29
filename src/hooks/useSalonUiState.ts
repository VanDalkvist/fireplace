import { useState, useCallback } from "react";
import type { SpeechEngineKind } from "@/speech/speech-types";
import { defaultDistillerRegistry } from "@/composition/distillers";

export function isRemoteHost(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host !== "localhost" && host !== "127.0.0.1" && host !== "";
}

export function useSalonUiState() {
  const isVoiceInit = typeof window !== "undefined" && window.location.search.includes("voice=1");
  const isRemote = isRemoteHost();

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = useCallback((msg: string) => setToastMessage(msg), []);
  const clearToast = useCallback(() => setToastMessage(null), []);

  const [isPultOpen, setIsPultOpen] = useState(false);
  const [isIntroOpen, setIsIntroOpen] = useState(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [isZen, setIsZen] = useState(false);
  const [volume, setVolume] = useState(0.6);

  const [sttEngine, setSttEngine] = useState<SpeechEngineKind>(() => {
    if (typeof window === "undefined") return "gigaam";
    if (window.location.search.includes("stt=google")) return "google";
    if (window.location.search.includes("stt=whisper")) return "whisper";
    if (window.location.search.includes("stt=gigaam")) return "gigaam";
    return isRemote ? "google" : "gigaam";
  });

  const [isDemoActive, setIsDemoActive] = useState(() => {
    if (typeof window === "undefined") return false;
    const search = window.location.search;
    return (
      search.includes("demo=1") ||
      search.includes("demo=true") ||
      new URLSearchParams(search).has("demo")
    );
  });

  const [isVerbatimMode, setIsVerbatimModeState] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    if (window.location.search.includes("verbatim=1")) return true;
    if (window.location.search.includes("verbatim=0")) return false;
    const local = localStorage.getItem("salon_verbatim_mode");
    if (local !== null) return local === "true";
    return isRemote;
  });

  const [distillerEngine, setDistillerEngineState] = useState<string>(() => {
    if (typeof window === "undefined") return "openrouter";
    const urlEngine = new URLSearchParams(window.location.search).get("distiller_engine");
    if (urlEngine) return urlEngine;
    const local = localStorage.getItem("salon_distiller_engine");
    if (local) return local;
    return "openrouter";
  });

  const toggleDistillerEngine = useCallback(() => {
    setDistillerEngineState((prev) => {
      const ids = defaultDistillerRegistry.list().map(adapter => adapter.id);
      const next = ids[(ids.indexOf(prev) + 1) % ids.length];
      if (typeof window !== "undefined") {
        localStorage.setItem("salon_distiller_engine", next);
      }
      return next;
    });
  }, []);

  const setIsVerbatimMode = useCallback((val: boolean | ((prev: boolean) => boolean)) => {
    setIsVerbatimModeState((prev) => {
      const next = typeof val === "function" ? val(prev) : val;
      if (typeof window !== "undefined") {
        localStorage.setItem("salon_verbatim_mode", String(next));
      }
      return next;
    });
  }, []);

  return {
    isVoiceInit,
    isRemote,
    toastMessage,
    showToast,
    clearToast,
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
