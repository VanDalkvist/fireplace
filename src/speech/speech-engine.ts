import type {
  SpeechRecognitionConstructor,
  SpeechRecognitionInstanceLike,
  SpeechRecognitionEventLike,
  SpeechRecognitionErrorEventLike,
} from "./speech-types";

export interface SpeechEngineCallbacks {
  onInterimPhrase?: (text: string) => void;
  onFinalPhrase?: (text: string) => void;
  onError?: (error: string) => void;
  onStatusChange?: (isListening: boolean) => void;
}

export class SalonSpeechEngine {
  private recognition: SpeechRecognitionInstanceLike | null = null;
  private isListeningActive = false;
  private shouldRestart = false;
  private callbacks: SpeechEngineCallbacks;
  private restartTimer: ReturnType<typeof setTimeout> | null = null;
  private silenceTimer: ReturnType<typeof setTimeout> | null = null;
  private lastInterimText = "";

  constructor(callbacks: SpeechEngineCallbacks = {}) {
    this.callbacks = callbacks;
    this.initRecognition();
  }

  public isSupported(): boolean {
    if (typeof window === "undefined") return false;
    const nav = window as unknown as {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    return Boolean(nav.SpeechRecognition || nav.webkitSpeechRecognition);
  }

  private initRecognition(): void {
    if (typeof window === "undefined") return;
    const nav = window as unknown as {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    const ctor = nav.SpeechRecognition || nav.webkitSpeechRecognition;
    if (!ctor) return;

    try {
      this.recognition = new ctor();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = "ru-RU";
      this.recognition.maxAlternatives = 1;

      this.recognition.onstart = () => {
        this.isListeningActive = true;
        this.callbacks.onStatusChange?.(true);
      };

      this.recognition.onend = () => {
        this.isListeningActive = false;
        this.callbacks.onStatusChange?.(false);
        if (this.shouldRestart) {
          this.scheduleRestart();
        }
      };

      this.recognition.onerror = (ev: SpeechRecognitionErrorEventLike) => {
        if (ev.error === "no-speech") return;
        if (ev.error === "not-allowed" || ev.error === "service-not-allowed") {
          this.shouldRestart = false;
        }
        this.callbacks.onError?.(ev.error);
      };

      this.recognition.onresult = (ev: SpeechRecognitionEventLike) => {
        let interimText = "";
        let finalText = "";
        for (let i = ev.resultIndex; i < ev.results.length; i++) {
          const item = ev.results.item(i);
          const text = item[0]?.transcript || "";
          if (item.isFinal) {
            finalText += text;
          } else {
            interimText += text;
          }
        }
        if (interimText.trim()) {
          this.lastInterimText = interimText.trim();
          this.callbacks.onInterimPhrase?.(this.lastInterimText);
          if (this.silenceTimer) clearTimeout(this.silenceTimer);
          this.silenceTimer = setTimeout(() => {
            if (this.lastInterimText) {
              const flushed = this.lastInterimText;
              this.lastInterimText = "";
              this.callbacks.onFinalPhrase?.(flushed);
            }
          }, 1400);
        }
        if (finalText.trim()) {
          if (this.silenceTimer) clearTimeout(this.silenceTimer);
          this.lastInterimText = "";
          this.callbacks.onFinalPhrase?.(finalText.trim());
        }
      };
    } catch (err) {
      this.callbacks.onError?.(err instanceof Error ? err.message : String(err));
    }
  }

  private scheduleRestart(): void {
    if (this.restartTimer) clearTimeout(this.restartTimer);
    this.restartTimer = setTimeout(() => {
      if (this.shouldRestart && !this.isListeningActive && this.recognition) {
        try {
          this.recognition.start();
        } catch {
          // Ignore if already starting
        }
      }
    }, 400);
  }

  public start(): void {
    if (!this.recognition) return;
    this.shouldRestart = true;
    if (!this.isListeningActive) {
      try {
        this.recognition.start();
      } catch {
        // Recognition might already be running
      }
    }
  }

  public stop(): void {
    this.shouldRestart = false;
    this.lastInterimText = "";
    if (this.silenceTimer) clearTimeout(this.silenceTimer);
    if (this.restartTimer) clearTimeout(this.restartTimer);
    if (this.recognition && this.isListeningActive) {
      try {
        this.recognition.stop();
      } catch {
        // Ignore stop error
      }
    }
  }

  public toggle(): boolean {
    if (this.shouldRestart || this.isListeningActive) {
      this.stop();
      return false;
    }
    this.start();
    return true;
  }

  public get isListening(): boolean {
    return this.isListeningActive;
  }
}
