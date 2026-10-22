import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WhisperSpeechAdapter } from '../src/speech/whisper-speech-adapter';
import type { SpeechEngineCallbacks } from '../src/speech/speech-types';

describe('WhisperSpeechAdapter', () => {
  let callbacks: SpeechEngineCallbacks;
  let adapter: WhisperSpeechAdapter;

  beforeEach(() => {
    callbacks = {
      onInterimPhrase: vi.fn<(text: string) => void>(),
      onFinalPhrase: vi.fn<(text: string) => void>(),
      onError: vi.fn<(error: string) => void>(),
      onStatusChange: vi.fn<(active: boolean) => void>(),
    };
    adapter = new WhisperSpeechAdapter(callbacks, 'http://127.0.0.1:8085');
  });

  it('implements SpeechEnginePort contract and returns engine type whisper', () => {
    expect(adapter.getEngineType()).toBe('whisper');
    expect(typeof adapter.start).toBe('function');
    expect(typeof adapter.stop).toBe('function');
    expect(typeof adapter.toggle).toBe('function');
    expect(typeof adapter.flush).toBe('function');
  });

  it('checks environment support for MediaRecorder and getUserMedia', () => {
    (globalThis as unknown as { window: unknown }).window = globalThis;
    Object.defineProperty(globalThis, 'navigator', {
      value: { mediaDevices: { getUserMedia: vi.fn() } },
      configurable: true,
    });
    (globalThis as unknown as { MediaRecorder: unknown }).MediaRecorder = vi.fn();

    expect(adapter.isSupported()).toBe(true);
  });

  it('keeps listening active after flushing an utterance in continuous open-mic mode', async () => {
    const mockRecorder = {
      start: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn().mockResolvedValue(new Blob(['chunk'])),
      extractCurrentSegment: vi.fn().mockReturnValue(new Blob(['phrase audio'], { type: 'audio/webm' })),
      cleanup: vi.fn(),
      isRecording: true,
    };
    (adapter as unknown as { recorder: typeof mockRecorder }).recorder = mockRecorder;

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ text: 'тихий покой' }),
    } as unknown as Response);

    await adapter.start();
    expect(callbacks.onStatusChange).toHaveBeenCalledWith(true);

    // Flush current phrase segment
    adapter.flush();

    // Give microtask tick for async fetch
    await new Promise((r) => setTimeout(r, 10));

    expect(callbacks.onFinalPhrase).toHaveBeenCalledWith('тихий покой');
    // In Open-Mic mode, status change to false MUST NOT be called!
    expect(callbacks.onStatusChange).not.toHaveBeenCalledWith(false);
  });

  it('skips sending silent audio to Whisper when no speech activity is detected', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const mockRecorder = {
      start: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn().mockResolvedValue(new Blob([])),
      extractCurrentSegment: vi.fn().mockReturnValue(new Blob(['silence audio'], { type: 'audio/webm' })),
      hasSpeechInCurrentSegment: vi.fn().mockReturnValue(false), // Silence!
      cleanup: vi.fn(),
      isRecording: true,
    };
    (adapter as unknown as { recorder: typeof mockRecorder }).recorder = mockRecorder;

    await adapter.start();

    // Trigger normal interval-based segment processing on silence
    (adapter as unknown as { processCurrentSegment: (overlap?: number, isExplicit?: boolean) => Promise<void> })
      .processCurrentSegment(300, false);
    await new Promise((r) => setTimeout(r, 10));

    // Whisper should NOT be called on silence!
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(callbacks.onFinalPhrase).not.toHaveBeenCalled();
  });

  it('synchronizes listening state and stops silence timer on Whisper network error', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Whisper server connection refused'));

    const mockRecorder = {
      start: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn().mockResolvedValue(new Blob([])),
      extractCurrentSegment: vi.fn().mockReturnValue(new Blob(['speech audio'], { type: 'audio/webm' })),
      hasSpeechInCurrentSegment: vi.fn().mockReturnValue(true),
      cleanup: vi.fn(),
      isRecording: true,
    };
    (adapter as unknown as { recorder: typeof mockRecorder }).recorder = mockRecorder;

    await adapter.start();
    adapter.flush();

    await new Promise((r) => setTimeout(r, 10));

    expect(callbacks.onError).toHaveBeenCalled();
    expect(callbacks.onStatusChange).toHaveBeenCalledWith(false);

    // Clicking toggle should start listening again, NOT stop!
    const startSpy = vi.spyOn(adapter, 'start');
    adapter.toggle();
    expect(startSpy).toHaveBeenCalled();
  });
});
