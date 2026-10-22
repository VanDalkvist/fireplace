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

  it('keeps listening active after flushing an utterance in continuous open-mic mode and identifies speaker', async () => {
    const mockRecorder = {
      start: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn().mockResolvedValue(new Blob(['chunk'])),
      extractCurrentSegment: vi.fn().mockReturnValue(new Blob(['phrase audio'], { type: 'audio/webm' })),
      cleanup: vi.fn(),
      isRecording: true,
    };
    (adapter as unknown as { recorder: typeof mockRecorder }).recorder = mockRecorder;

    const mockSpeaker = {
      identify: vi.fn().mockResolvedValue({
        matched: true,
        speakerId: 'seat_3',
        seatNumber: 3,
        score: 0.89,
      }),
      reset: vi.fn().mockResolvedValue(true),
      getEnrolledSpeakers: vi.fn().mockResolvedValue([]),
      isAvailable: vi.fn().mockResolvedValue(true),
    };
    (adapter as unknown as { speakerPort: typeof mockSpeaker }).speakerPort = mockSpeaker;

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      if (String(url).includes('/api/client-log')) {
        return { ok: true, status: 200 } as unknown as Response;
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ text: 'тихий покой' }),
      } as unknown as Response;
    });

    await adapter.start();
    expect(callbacks.onStatusChange).toHaveBeenCalledWith(true);

    // Flush current phrase segment
    adapter.flush();

    // Give microtask tick for async fetch
    await new Promise((r) => setTimeout(r, 10));

    expect(callbacks.onFinalPhrase).toHaveBeenCalledWith('тихий покой', 3);
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
    await (adapter as unknown as { processCurrentSegment: (isExplicit?: boolean) => Promise<void> })
      .processCurrentSegment(false);
    await new Promise((r) => setTimeout(r, 10));

    // ASR endpoint should NOT be called on silence!
    const asrCalls = fetchSpy.mock.calls.filter(([url]) =>
      String(url).includes(':8085') || String(url).includes(':9876')
    );
    expect(asrCalls.length).toBe(0);
    expect(callbacks.onFinalPhrase).not.toHaveBeenCalled();
  });

  it('synchronizes listening state and stops silence timer after consecutive fatal ASR network errors', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Whisper server connection refused'));

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
    // 3 consecutive failures to trigger shutdown
    adapter.flush();
    await new Promise((r) => setTimeout(r, 10));
    adapter.flush();
    await new Promise((r) => setTimeout(r, 10));
    adapter.flush();
    await new Promise((r) => setTimeout(r, 10));

    expect(callbacks.onError).toHaveBeenCalled();
    expect(callbacks.onStatusChange).toHaveBeenCalledWith(false);

    // Clicking toggle should start listening again, NOT stop!
    const startSpy = vi.spyOn(adapter, 'start');
    adapter.toggle();
    expect(startSpy).toHaveBeenCalled();
  });

  it('identifies speaker on stop() during final phrase processing', async () => {
    const finalChunk = new Uint8Array(300); // > 200 bytes
    const mockRecorder = {
      start: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn().mockResolvedValue(new Blob([finalChunk], { type: 'audio/webm' })),
      extractCurrentSegment: vi.fn().mockReturnValue(new Blob([])),
      cleanup: vi.fn(),
      isRecording: true,
    };
    (adapter as unknown as { recorder: typeof mockRecorder }).recorder = mockRecorder;

    const mockSpeaker = {
      identify: vi.fn().mockResolvedValue({
        matched: true,
        speakerId: 'seat_5',
        seatNumber: 5,
        score: 0.91,
      }),
      reset: vi.fn().mockResolvedValue(true),
      getEnrolledSpeakers: vi.fn().mockResolvedValue([]),
      isAvailable: vi.fn().mockResolvedValue(true),
    };
    (adapter as unknown as { speakerPort: typeof mockSpeaker }).speakerPort = mockSpeaker;

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ text: 'завершающее слово' }),
    } as unknown as Response);

    await adapter.start();
    await adapter.stop();

    expect(mockSpeaker.identify).toHaveBeenCalled();
    expect(callbacks.onFinalPhrase).toHaveBeenCalledWith('завершающее слово', 5);
  });

  it('notifies pipeline status transitions: hearing on speech start, transcribing on speech end', async () => {
    callbacks.onPipelineStatus = vi.fn();
    const extractSpy = vi.fn().mockReturnValue(new Blob(['speech audio'], { type: 'audio/webm' }));
    let capturedCallbacks: { onSpeechStart?: () => void; onSpeechEnd?: () => void } = {};

    const mockRecorder = {
      start: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn().mockResolvedValue(new Blob([])),
      extractCurrentSegment: extractSpy,
      extractSegmentWithContext: extractSpy,
      setVadCallbacks: vi.fn((cb) => { capturedCallbacks = cb; }),
      hasSpeechInCurrentSegment: vi.fn().mockReturnValue(true),
      cleanup: vi.fn(),
      isRecording: true,
    };
    (adapter as unknown as { recorder: typeof mockRecorder }).recorder = mockRecorder;

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      if (String(url).includes('/api/client-log')) return { ok: true } as unknown as Response;
      return { ok: true, json: async () => ({ text: 'живое слово' }) } as unknown as Response;
    });

    await adapter.start();

    // 1. Speech starts
    capturedCallbacks.onSpeechStart?.();
    expect(callbacks.onPipelineStatus).toHaveBeenCalledWith('hearing');

    // 2. Speech ends (natural pause)
    capturedCallbacks.onSpeechEnd?.();
    expect(callbacks.onPipelineStatus).toHaveBeenCalledWith('transcribing');

    await new Promise((r) => setTimeout(r, 10));
    expect(callbacks.onFinalPhrase).toHaveBeenCalledWith('живое слово', undefined);
  });
});
