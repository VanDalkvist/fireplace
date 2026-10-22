import { useState } from "react";
import type { SpeechEngineKind } from "@/speech/speech-types";

export function useSalonUiState() {
  const isVoiceInit = typeof window !== "undefined" && window.location.search.includes("voice=1");
  const [isPultOpen, setIsPultOpen] = useState(false);
  const [isIntroOpen, setIsIntroOpen] = useState(false);
  const [isZen, setIsZen] = useState(false);
  const [volume, setVolume] = useState(0.6);
  const [sttEngine, setSttEngine] = useState<SpeechEngineKind>(() =>
    typeof window !== "undefined" && window.location.search.includes("stt=google") ? "google" : "whisper"
  );
  const [isDemoActive, setIsDemoActive] = useState(() =>
    typeof window !== "undefined" && window.location.search.includes("demo=1")
  );

  return {
    isVoiceInit,
    isPultOpen,
    setIsPultOpen,
    isIntroOpen,
    setIsIntroOpen,
    isZen,
    setIsZen,
    volume,
    setVolume,
    sttEngine,
    setSttEngine,
    isDemoActive,
    setIsDemoActive,
  };
}
