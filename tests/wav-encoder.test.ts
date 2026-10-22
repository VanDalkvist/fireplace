import { describe, it, expect } from "vitest";
import { encodeWav16kMono } from "../src/speech/wav-encoder";

describe("WavEncoder", () => {
  it("encodes float32 samples to valid 16kHz mono WAV Blob", () => {
    const samples = new Float32Array([0.0, 0.5, -0.5, 1.0, -1.0]);
    const blob = encodeWav16kMono(samples);

    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe("audio/wav");
    // 44 bytes header + 5 * 2 bytes samples = 54 bytes
    expect(blob.size).toBe(54);
  });
});
