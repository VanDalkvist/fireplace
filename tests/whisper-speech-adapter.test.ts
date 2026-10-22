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
});
