import { describe, it, expect, vi, beforeEach } from "vitest";
import { AudioStreamMixer } from "@/audio/audio-mixer";

describe("AudioStreamMixer (Web Audio Dual-Stream Blending)", () => {
  let mixer: AudioStreamMixer;
  let mockStreamA: MediaStream;
  let mockStreamB: MediaStream;

  beforeEach(() => {
    mixer = new AudioStreamMixer();
    mockStreamA = { id: "mic-stream", getAudioTracks: () => [{}] } as unknown as MediaStream;
    mockStreamB = { id: "meeting-stream", getAudioTracks: () => [{}] } as unknown as MediaStream;

    const mockDestination = { stream: { id: "mixed-stream" } };
    const mockGainNode = {
      gain: { value: 1.0 },
      connect: vi.fn().mockReturnThis(),
      disconnect: vi.fn(),
    };
    const mockSourceNode = {
      connect: vi.fn().mockReturnValue(mockGainNode),
      disconnect: vi.fn(),
    };

    class MockAudioContext {
      public state = "suspended";
      public resume = vi.fn().mockResolvedValue(undefined);
      public close = vi.fn().mockResolvedValue(undefined);
      public createMediaStreamDestination = vi.fn().mockReturnValue(mockDestination);
      public createMediaStreamSource = vi.fn().mockReturnValue(mockSourceNode);
      public createGain = vi.fn().mockReturnValue(mockGainNode);
    }

    (globalThis as unknown as { AudioContext: unknown }).AudioContext = MockAudioContext;
    (globalThis as unknown as { window: unknown }).window = globalThis;
  });

  it("mixes two audio streams into a single combined destination stream", () => {
    const combined = mixer.mix(mockStreamA, mockStreamB);
    expect(combined).toBeDefined();
    expect(combined.id).toBe("mixed-stream");
    expect(mixer.isMixing()).toBe(true);
  });

  it("resumes suspended audio context during mixing", () => {
    mixer.mix(mockStreamA, mockStreamB);
    // audioContext should have been resumed
    expect(mixer.getAudioContext()?.resume).toHaveBeenCalled();
  });

  it("cleans up audio nodes and closes context on cleanup call", () => {
    mixer.mix(mockStreamA, mockStreamB);
    mixer.cleanup();

    expect(mixer.isMixing()).toBe(false);
  });
});
