import { describe, it, expect, vi } from 'vitest';
import { SpeechServiceRegistry } from '../src/speech/speech-registry';
import type { SpeechToTextPort } from '../src/speech/speech-types';

describe('SpeechServiceRegistry (DI Container)', () => {
  it('registers ASR providers and allows retrieving by ID', () => {
    const registry = new SpeechServiceRegistry();

    const mockGigaAm: SpeechToTextPort = {
      id: 'gigaam',
      name: 'GigaAM v3',
      isLocal: true,
      baseUrl: 'http://127.0.0.1:9876',
      transcribe: vi.fn().mockResolvedValue('привет из gigaam'),
    };

    const mockWhisper: SpeechToTextPort = {
      id: 'whisper',
      name: 'Whisper Turbo',
      isLocal: true,
      baseUrl: 'http://127.0.0.1:8085',
      transcribe: vi.fn().mockResolvedValue('привет из whisper'),
    };

    registry.register(mockGigaAm);
    registry.register(mockWhisper);

    expect(registry.get('gigaam')).toBe(mockGigaAm);
    expect(registry.get('whisper')).toBe(mockWhisper);
    expect(registry.list().map((e) => e.id)).toEqual(['gigaam', 'whisper']);
  });

  it('manages active provider with default fallback', () => {
    const registry = new SpeechServiceRegistry();

    const mockGigaAm: SpeechToTextPort = {
      id: 'gigaam',
      name: 'GigaAM v3',
      isLocal: true,
      transcribe: vi.fn(),
    };

    const mockWhisper: SpeechToTextPort = {
      id: 'whisper',
      name: 'Whisper Turbo',
      isLocal: true,
      transcribe: vi.fn(),
    };

    registry.register(mockGigaAm);
    registry.register(mockWhisper);

    // Default active is first registered or explicitly set
    expect(registry.getActive().id).toBe('gigaam');

    registry.setActive('whisper');
    expect(registry.getActive().id).toBe('whisper');
  });

  it('throws error when setting unknown provider as active', () => {
    const registry = new SpeechServiceRegistry();
    expect(() => registry.setActive('non-existent')).toThrow(
      "Provider 'non-existent' is not registered"
    );
  });
});
