export interface VadResult {
  isSpeaking: boolean;
  energy: number;
  noiseFloor: number;
  threshold: number;
}

export interface VadOptions {
  /** Multiplier above noiseFloor to trigger speech. Default 2.5 (~ +8 dB). */
  thresholdRatio?: number;
  /** EMA alpha for noise floor adaptation during silence. Default 0.05. */
  noiseFloorAlpha?: number;
  /** Number of hangover frames to stay active during brief energy dips. Default 12 (~250-300ms). */
  hangoverFrames?: number;
  /** Initial noise floor estimate in RMS. Default 0.001. */
  initialNoiseFloor?: number;
  /** Minimum clamped noise floor to prevent division by zero or hypersensitivity. Default 0.0003. */
  minNoiseFloor?: number;
}

export interface VoiceActivityDetectorPort {
  process(frame: Float32Array): VadResult;
  reset(): void;
  getNoiseFloor(): number;
  isSpeechActive(): boolean;
}
