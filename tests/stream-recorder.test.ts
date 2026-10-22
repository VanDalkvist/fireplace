import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StreamRecorder } from '../src/speech/stream-recorder';

describe('StreamRecorder', () => {
  let recorder: StreamRecorder;
  let mockStream: MediaStream;
  let mockTrack: { stop: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    recorder = new StreamRecorder();
    mockTrack = { stop: vi.fn() };
    mockStream = {
      getTracks: vi.fn(() => [mockTrack]),
    } as unknown as MediaStream;

    class MockMediaRecorder {
      public state: 'inactive' | 'recording' = 'inactive';
      public mimeType = 'audio/webm';
      public ondataavailable: ((e: { data: Blob }) => void) | null = null;
      public onstop: (() => void) | null = null;
      public startedWithTimeslice: number | undefined;

      public start(timeslice?: number): void {
        this.state = 'recording';
        this.startedWithTimeslice = timeslice;
      }

      public stop(): void {
        this.state = 'inactive';
        if (this.ondataavailable) {
          this.ondataavailable({ data: new Blob(['recorded chunk'], { type: 'audio/webm' }) });
        }
        if (this.onstop) {
          this.onstop();
        }
      }

      public static isTypeSupported(): boolean {
        return true;
      }
    }

    (globalThis as unknown as { MediaRecorder: unknown }).MediaRecorder = MockMediaRecorder;
  });

  it('starts recording from provided stream and reports isRecording true', async () => {
    await recorder.start(mockStream);
    expect(recorder.isRecording).toBe(true);
  });

  it('stops recording and resolves recorded audio Blob', async () => {
    await recorder.start(mockStream);
    const blobPromise = recorder.stop();

    const blob = await blobPromise;
    expect(blob).toBeInstanceOf(Blob);
    expect(recorder.isRecording).toBe(false);
  });

  it('extracts current segment as Blob while keeping recording active (zero loss)', async () => {
    await recorder.start(mockStream, 250);

    const mediaRecInstance = (recorder as unknown as { mediaRecorder: { ondataavailable: (e: { data: Blob }) => void } }).mediaRecorder;
    mediaRecInstance.ondataavailable({ data: new Blob(['chunk1 '], { type: 'audio/webm' }) });
    mediaRecInstance.ondataavailable({ data: new Blob(['chunk2 '], { type: 'audio/webm' }) });

    const segment = recorder.extractCurrentSegment(0);
    expect(segment).toBeInstanceOf(Blob);
    expect(recorder.isRecording).toBe(true);

    const text = await segment.text();
    expect(text).toBe('chunk1 chunk2 ');
  });

  it('preserves overlap chunk when extracting segment', async () => {
    await recorder.start(mockStream, 250);

    const mediaRecInstance = (recorder as unknown as { mediaRecorder: { ondataavailable: (e: { data: Blob }) => void } }).mediaRecorder;
    mediaRecInstance.ondataavailable({ data: new Blob(['partA '], { type: 'audio/webm' }) });
    mediaRecInstance.ondataavailable({ data: new Blob(['partB '], { type: 'audio/webm' }) });

    // With overlap, partB is kept for the next segment
    const segment1 = recorder.extractCurrentSegment(300);
    expect(segment1).toBeInstanceOf(Blob);

    mediaRecInstance.ondataavailable({ data: new Blob(['partC '], { type: 'audio/webm' }) });
    const segment2 = recorder.extractCurrentSegment(0);
    const text2 = await segment2.text();

    expect(text2).toBe('partB partC ');
  });

  it('tracks voice activity and reports whether speech occurred in the segment', async () => {
    await recorder.start(mockStream, 250);

    // Initial state: silence
    expect(recorder.hasSpeechInCurrentSegment()).toBe(false);

    // Simulate voice activity (mock RMS reading)
    (recorder as unknown as { setMockVoiceActivityForTesting?: (val: boolean) => void }).setMockVoiceActivityForTesting?.(true);

    expect(recorder.hasSpeechInCurrentSegment()).toBe(true);

    // After extracting segment, speech flag is reset for the next segment
    recorder.extractCurrentSegment(0);
    expect(recorder.hasSpeechInCurrentSegment()).toBe(false);
  });

  it('cleans up stream tracks upon cleanup call', async () => {
    await recorder.start(mockStream);
    recorder.cleanup();

    expect(mockTrack.stop).toHaveBeenCalled();
  });
});
