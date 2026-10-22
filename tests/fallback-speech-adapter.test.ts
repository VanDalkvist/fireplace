import { describe, it, expect, vi } from 'vitest';
import { FallbackSpeechAdapter } from '../src/speech/fallback-speech-adapter';
import type { SpeechToTextPort } from '../src/speech/speech-types';

describe('FallbackSpeechAdapter', () => {
  it('returns primary transcription when primary succeeds', async () => {
    const primary: SpeechToTextPort = {
      id: 'gigaam',
      name: 'Sber GigaAM v3',
      isLocal: true,
      transcribe: vi.fn().mockResolvedValue('Первичный результат'),
    };
    const fallback: SpeechToTextPort = {
      id: 'whisper',
      name: 'Whisper Large Turbo',
      isLocal: true,
      transcribe: vi.fn().mockResolvedValue('Фолбэк результат'),
    };

    const adapter = new FallbackSpeechAdapter(primary, fallback);
    const result = await adapter.transcribe(new Blob(['audio'], { type: 'audio/webm' }));

    expect(result).toBe('Первичный результат');
    expect(primary.transcribe).toHaveBeenCalled();
    expect(fallback.transcribe).not.toHaveBeenCalled();
  });

  it('transparently delegates to fallback when primary fails with error', async () => {
    const primary: SpeechToTextPort = {
      id: 'gigaam',
      name: 'Sber GigaAM v3',
      isLocal: true,
      transcribe: vi.fn().mockRejectedValue(new Error('ASR server responded with HTTP 422')),
    };
    const fallback: SpeechToTextPort = {
      id: 'whisper',
      name: 'Whisper Large Turbo',
      isLocal: true,
      transcribe: vi.fn().mockResolvedValue('Фолбэк подхватил фразу'),
    };

    const adapter = new FallbackSpeechAdapter(primary, fallback);
    const result = await adapter.transcribe(new Blob(['audio'], { type: 'audio/webm' }));

    expect(result).toBe('Фолбэк подхватил фразу');
    expect(primary.transcribe).toHaveBeenCalled();
    expect(fallback.transcribe).toHaveBeenCalled();
  });
});
