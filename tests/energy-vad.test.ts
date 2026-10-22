import { describe, it, expect, beforeEach } from "vitest";
import { EnergyVad } from "@/speech/vad/energy-vad";

describe("EnergyVad (AssemblyAI Adaptive Pattern)", () => {
  let vad: EnergyVad;

  beforeEach(() => {
    vad = new EnergyVad({
      thresholdRatio: 2.5,
      noiseFloorAlpha: 0.1,
      hangoverFrames: 3,
      initialNoiseFloor: 0.001,
    });
  });

  it("adapts noise floor downward and upward during steady non-speech audio", () => {
    // Generate low-energy noise frames (RMS ~0.002)
    const noiseFrame = new Float32Array(128).fill(0.002);
    
    let res = vad.process(noiseFrame);
    // Initial noiseFloor is 0.001, frame is 0.002. Threshold is 0.001 * 2.5 = 0.0025.
    // 0.002 is below threshold 0.0025, so non-speech
    expect(res.isSpeaking).toBe(false);
    expect(res.noiseFloor).toBeGreaterThan(0.001); // adapted upwards towards 0.002
  });

  it("detects speech when energy crosses adaptive threshold", () => {
    // Calibrate on quiet room (RMS 0.001)
    const quietFrame = new Float32Array(128).fill(0.001);
    for (let i = 0; i < 5; i++) {
      vad.process(quietFrame);
    }

    // Now sudden speech frame (RMS 0.02, 20x noise floor)
    const speechFrame = new Float32Array(128).fill(0.02);
    const res = vad.process(speechFrame);

    expect(res.isSpeaking).toBe(true);
    expect(res.energy).toBeCloseTo(0.02, 3);
  });

  it("maintains speech active state during short hangover pause dips", () => {
    // 1. Trigger speech
    const speechFrame = new Float32Array(128).fill(0.03);
    expect(vad.process(speechFrame).isSpeaking).toBe(true);

    // 2. Dip into silence (frame 1 of hangover)
    const dipFrame = new Float32Array(128).fill(0.0005);
    const dip1 = vad.process(dipFrame);
    expect(dip1.isSpeaking).toBe(true); // Hangover holds speech active

    // Frame 2 of hangover
    const dip2 = vad.process(dipFrame);
    expect(dip2.isSpeaking).toBe(true);

    // Frame 3 of hangover
    const dip3 = vad.process(dipFrame);
    expect(dip3.isSpeaking).toBe(true);

    // Frame 4: hangover exhausted, returns to silence
    const dip4 = vad.process(dipFrame);
    expect(dip4.isSpeaking).toBe(false);
  });

  it("freezes noise floor adaptation while speech is active so loud speech does not inflate noise floor", () => {
    // Establish noise floor around 0.001
    const quietFrame = new Float32Array(128).fill(0.001);
    for (let i = 0; i < 5; i++) {
      vad.process(quietFrame);
    }
    const baselineFloor = vad.getNoiseFloor();

    // Intense speech (RMS 0.1)
    const loudSpeech = new Float32Array(128).fill(0.1);
    vad.process(loudSpeech);
    vad.process(loudSpeech);

    // Noise floor must not have climbed up to 0.1!
    expect(vad.getNoiseFloor()).toBeCloseTo(baselineFloor, 4);
  });

  it("resets state back to initial values", () => {
    const loudSpeech = new Float32Array(128).fill(0.1);
    vad.process(loudSpeech);
    vad.reset();
    expect(vad.getNoiseFloor()).toBe(0.001);
  });
});
