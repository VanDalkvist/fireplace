export type SpeechEngineKind = "whisper" | "google";

export interface SpeechEngineCallbacks {
  onInterimPhrase?: (text: string) => void;
  onFinalPhrase?: (text: string) => void;
  onError?: (error: string) => void;
  onStatusChange?: (active: boolean) => void;
}

export interface SpeechEnginePort {
  start(stream?: MediaStream): void | Promise<void>;
  stop(): void | Promise<void>;
  toggle(): void | boolean | Promise<void | boolean>;
  flush(): void;
  isSupported(): boolean;
  getEngineType(): SpeechEngineKind;
}

export interface SpeechRecognitionAlternativeLike {
  readonly transcript: string;
  readonly confidence: number;
}

export interface SpeechRecognitionResultLike {
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): SpeechRecognitionAlternativeLike;
  [index: number]: SpeechRecognitionAlternativeLike;
}

export interface SpeechRecognitionResultListLike {
  readonly length: number;
  item(index: number): SpeechRecognitionResultLike;
  [index: number]: SpeechRecognitionResultLike;
}

export interface SpeechRecognitionEventLike extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultListLike;
}

export interface SpeechRecognitionErrorEventLike extends Event {
  readonly error: string;
  readonly message?: string;
}

export interface SpeechRecognitionInstanceLike extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: ((this: SpeechRecognitionInstanceLike, ev: Event) => void) | null;
  onend: ((this: SpeechRecognitionInstanceLike, ev: Event) => void) | null;
  onerror: ((this: SpeechRecognitionInstanceLike, ev: SpeechRecognitionErrorEventLike) => void) | null;
  onresult: ((this: SpeechRecognitionInstanceLike, ev: SpeechRecognitionEventLike) => void) | null;
}

export type SpeechRecognitionConstructor = new () => SpeechRecognitionInstanceLike;
