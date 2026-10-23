import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  checkOpenAiSpeechStatus,
  transcribeAudioBlobOpenAi,
} from '../src/speech/openai-speech-client';

describe('OpenAI Speech Client', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('checks status of OpenAI-compatible ASR server and returns online true', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      if (String(url).includes('/ready')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ model: 'gigaam-v3' }),
        } as unknown as Response;
      }
      return { ok: true, status: 200 } as unknown as Response;
    });

    const status = await checkOpenAiSpeechStatus('http://127.0.0.1:9876');
    expect(status.online).toBe(true);
  });

  it('returns online false when ASR server is unreachable', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Connection refused'));

    const status = await checkOpenAiSpeechStatus('http://127.0.0.1:9876');
    expect(status.online).toBe(false);
  });

  it('transcribes audio via standard POST /v1/audio/transcriptions', async () => {
    const fakeBlob = new Blob(['fake pcm audio'], { type: 'audio/wav' });

    let calledUrl = '';
    let calledBody: FormData | null = null;

    vi.spyOn(globalThis, 'fetch').mockImplementationOnce(async (input, init) => {
      calledUrl = String(input);
      calledBody = init?.body as FormData;
      return {
        ok: true,
        json: async () => ({ text: '  Я чувствую спокойствие и тепло  ' }),
      } as unknown as Response;
    });

    const result = await transcribeAudioBlobOpenAi(fakeBlob, {
      baseUrl: 'http://127.0.0.1:9876',
      model: 'gigaam-v3',
      language: 'ru',
    });

    expect(calledUrl).toBe('http://127.0.0.1:9876/v1/audio/transcriptions');
    expect(calledBody).toBeInstanceOf(FormData);
    expect(result).toBe('Я чувствую спокойствие и тепло');
  });

  it('does not guess another endpoint after an HTTP 404', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response("Not Found", {status:404}));
    await expect(transcribeAudioBlobOpenAi(new Blob(["x"]), {baseUrl:"http://127.0.0.1:8085"})).rejects.toThrow("404");
    expect(fetchSpy.mock.calls.filter(call => String(call[0]).startsWith("http://127.0.0.1:8085"))).toHaveLength(1);
    expect(fetchSpy.mock.calls.some(call => String(call[0]).endsWith("/inference"))).toBe(false);
  });

  it('uses the explicitly configured Whisper transport path', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({text:"распознано"})));
    expect(await transcribeAudioBlobOpenAi(new Blob(["x"]), {baseUrl:"http://127.0.0.1:8085",transcriptionPath:"/inference"})).toBe("распознано");
    expect(fetchSpy.mock.calls[0][0]).toBe("http://127.0.0.1:8085/inference");
  });

  it('throws descriptive error on server failure', async () => {
    const fakeBlob = new Blob(['bad audio'], { type: 'audio/wav' });

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error',
    } as unknown as Response);

    await expect(
      transcribeAudioBlobOpenAi(fakeBlob, { baseUrl: 'http://127.0.0.1:9876' })
    ).rejects.toThrow('ASR server responded with HTTP 500');
  });
});
