import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkWhisperStatus, transcribeAudioBlob } from '../src/speech/whisper-client';

describe('Whisper Client', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('checks status of local whisper-server and returns online true when server responds', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
    } as unknown as Response);

    const status = await checkWhisperStatus('http://127.0.0.1:8085');
    expect(status.online).toBe(true);
  });

  it('returns online false when whisper server fails or times out', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Connection refused'));

    const status = await checkWhisperStatus('http://127.0.0.1:8085');
    expect(status.online).toBe(false);
  });

  it('transcribes audio blob by posting form data to /inference and parsing text', async () => {
    const fakeBlob = new Blob(['fake audio'], { type: 'audio/webm' });

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ text: ' Я чувствую тепло и замедление у огня.\n' }),
    } as unknown as Response);

    const text = await transcribeAudioBlob(fakeBlob, { url: 'http://127.0.0.1:8085' });
    expect(text).toBe('Я чувствую тепло и замедление у огня.');
  });

  it('throws an error if whisper server returns an error response', async () => {
    const fakeBlob = new Blob(['bad audio'], { type: 'audio/webm' });

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 500,
    } as unknown as Response);

    await expect(transcribeAudioBlob(fakeBlob, { url: 'http://127.0.0.1:8085' })).rejects.toThrow(
      'Whisper server responded with HTTP 500'
    );
  });
});
