import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SalonAudioEngine } from '../src/audio/audio-engine';

describe('SalonAudioEngine Meeting Audio Capture', () => {
  let engine: SalonAudioEngine;
  let mockStream: {
    getAudioTracks: () => Array<{ stop: ReturnType<typeof vi.fn> }>;
    getVideoTracks: () => Array<{ stop: ReturnType<typeof vi.fn> }>;
  };

  let audioTrack: { stop: ReturnType<typeof vi.fn>; readyState: string; enabled?: boolean };
  let videoTrack: { stop: ReturnType<typeof vi.fn>; readyState: string; enabled?: boolean };

  beforeEach(() => {
    audioTrack = { stop: vi.fn(), readyState: 'live', enabled: true };
    videoTrack = { stop: vi.fn(), readyState: 'live', enabled: true };
    mockStream = {
      getAudioTracks: vi.fn(() => [audioTrack]),
      getVideoTracks: vi.fn(() => [videoTrack]),
    };

    Object.defineProperty(globalThis, 'navigator', {
      value: {
        mediaDevices: {
          getDisplayMedia: vi.fn().mockResolvedValue(mockStream),
        },
      },
      configurable: true,
      writable: true,
    });

    const mockCtx = {
      state: 'running',
      resume: vi.fn().mockResolvedValue(undefined),
      createMediaStreamSource: vi.fn().mockReturnValue({ connect: vi.fn(), disconnect: vi.fn() }),
      createAnalyser: vi.fn().mockReturnValue({
        fftSize: 256,
        getFloatTimeDomainData: vi.fn((buf: Float32Array) => buf.fill(0.05)),
      }),
      createGain: vi.fn().mockReturnValue({ gain: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() }, connect: vi.fn() }),
      createDynamicsCompressor: vi.fn().mockReturnValue({ connect: vi.fn(), threshold: {}, knee: {}, ratio: {}, attack: {}, release: {} }),
      destination: {},
    };

    function MockAudioContext() {
      return mockCtx;
    }

    (globalThis as unknown as { window: Record<string, unknown> }).window = {
      AudioContext: MockAudioContext,
    };

    engine = new SalonAudioEngine();
  });

  afterEach(() => {
    delete (globalThis as unknown as { navigator?: unknown }).navigator;
    delete (globalThis as unknown as { window?: unknown }).window;
  });

  it('captures meeting audio via getDisplayMedia and disables video track safely', async () => {
    const success = await engine.captureMeetingAudio();

    expect(success).toBe(true);
    expect(videoTrack.enabled).toBe(false);
    expect(engine.isMeetingAudioConnected).toBe(true);
  });

  it('disconnects meeting audio cleanly and stops audio tracks', async () => {
    await engine.captureMeetingAudio();
    engine.disconnectMeetingAudio();

    expect(audioTrack.stop).toHaveBeenCalled();
    expect(engine.isMeetingAudioConnected).toBe(false);
  });
});
