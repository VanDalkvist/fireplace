import type { VoiceActivityDetectorPort, VadResult, VadOptions } from "./vad-types";

/**
 * EnergyVad: Adaptive noise-floor tracking Voice Activity Detector.
 * Based on the AssemblyAI streaming EnergyVad pattern (MIT).
 *
 * Continuously adapts to background room acoustics using Exponential Moving Average (EMA)
 * when silence is present, freezes adaptation during speech, and provides hangover
 * frames to prevent voice fragmentation on brief consonant or breath pauses.
 */
export class EnergyVad implements VoiceActivityDetectorPort {
  private readonly thresholdRatio: number;
  private readonly noiseFloorAlpha: number;
  private readonly hangoverFrames: number;
  private readonly initialNoiseFloor: number;
  private readonly minNoiseFloor: number;

  private noiseFloor: number;
  private hangoverRemaining = 0;
  private active = false;

  constructor(options: VadOptions = {}) {
    this.thresholdRatio = options.thresholdRatio ?? 2.5;
    this.noiseFloorAlpha = options.noiseFloorAlpha ?? 0.05;
    this.hangoverFrames = options.hangoverFrames ?? 12;
    this.initialNoiseFloor = Math.max(options.initialNoiseFloor ?? 0.001, 0.0001);
    this.minNoiseFloor = options.minNoiseFloor ?? 0.0003;
    this.noiseFloor = this.initialNoiseFloor;
  }

  public process(frame: Float32Array): VadResult {
    let sumSq = 0;
    for (let i = 0; i < frame.length; i++) {
      sumSq += frame[i] * frame[i];
    }
    const rms = frame.length > 0 ? Math.sqrt(sumSq / frame.length) : 0;
    const threshold = Math.max(this.noiseFloor * this.thresholdRatio, this.minNoiseFloor * 1.5);

    const isRawActive = rms > threshold;

    if (isRawActive) {
      this.hangoverRemaining = this.hangoverFrames;
      this.active = true;
    } else if (this.hangoverRemaining > 0) {
      this.hangoverRemaining--;
      this.active = true;
    } else {
      this.active = false;
      // Adapt noise floor only when truly in non-speech (prevents vocal energy from raising floor)
      const smoothed = this.noiseFloor * (1 - this.noiseFloorAlpha) + rms * this.noiseFloorAlpha;
      this.noiseFloor = Math.max(smoothed, this.minNoiseFloor);
    }

    return {
      isSpeaking: this.active,
      energy: rms,
      noiseFloor: this.noiseFloor,
      threshold,
    };
  }

  public reset(): void {
    this.noiseFloor = this.initialNoiseFloor;
    this.hangoverRemaining = 0;
    this.active = false;
  }

  public getNoiseFloor(): number {
    return this.noiseFloor;
  }

  public isSpeechActive(): boolean {
    return this.active;
  }
}
