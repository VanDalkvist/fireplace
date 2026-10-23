/**
 * Hook for capturing system/meeting audio alongside microphone
 * Handles browser getDisplayMedia stream routing and teardown.
 * Compliance: AP-010, AP-019 (<= 250 lines), AP-029 (strict TS)
 */

import { useState, useEffect, useCallback, type MutableRefObject } from "react";
import type { SalonAudioEngine } from "@/audio/audio-engine";
import type { SpeechEnginePort, SpeechEngineKind } from "@/speech/speech-types";

interface UseMeetingAudioOptions {
  audioRef: MutableRefObject<SalonAudioEngine | null>;
  speechRef: MutableRefObject<SpeechEnginePort | null>;
  sttEngine: SpeechEngineKind;
  wasListeningRef: MutableRefObject<boolean>;
  onSwitchToWhisper?: () => void;
  onError?: (error: string | null) => void;
}

export function useMeetingAudio({
  audioRef,
  speechRef,
  sttEngine,
  wasListeningRef,
  onSwitchToWhisper,
  onError,
}: UseMeetingAudioOptions) {
  const [isMeetingConnected, setIsMeetingConnected] = useState(false);

  const toggleMeetingAudio = useCallback(async () => {
    if (!audioRef.current) return;
    if (isMeetingConnected) {
      audioRef.current.disconnectMeetingAudio();
      setIsMeetingConnected(false);
      void speechRef.current?.stop();
      void speechRef.current?.start();
    } else {
      if (sttEngine === "google") {
        onSwitchToWhisper?.();
      }
      const ok = await audioRef.current.captureMeetingAudio();
      setIsMeetingConnected(ok);
      if (ok) {
        const meetingStream = audioRef.current.getMeetingStream();
        if (meetingStream) {
          try {
            const micStream = await navigator.mediaDevices.getUserMedia({
              audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: true },
            });
            void speechRef.current?.stop();
            void speechRef.current?.start(micStream, meetingStream);
          } catch {
            void speechRef.current?.stop();
            void speechRef.current?.start(undefined, meetingStream);
          }
        }
      } else {
        onError?.("Звук экрана не обнаружен. Выберите 'Весь экран' и включите галочку 'Поделиться аудио'");
      }
    }
  }, [audioRef, isMeetingConnected, sttEngine, speechRef, onSwitchToWhisper, onError]);

  useEffect(() => {
    audioRef.current?.onMeetingAudioEnded(() => {
      setIsMeetingConnected(false);
      if (wasListeningRef.current) {
        void speechRef.current?.stop();
        void speechRef.current?.start();
      }
    });
  }, [audioRef, wasListeningRef, speechRef]);

  return {
    isMeetingConnected,
    toggleMeetingAudio,
  };
}
