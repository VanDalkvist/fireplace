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

    Object.defineProperty(globalThis, 'navigator', {
      value: { mediaDevices: { getUserMedia: vi.fn().mockResolvedValue(mockStream) } },
      configurable: true,
    });

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

  it('extracts current segment as a complete valid Blob and immediately restarts recorder for next segment', async () => {
    await recorder.start(mockStream, 250);

    const mediaRecInstance = (recorder as unknown as { mediaRecorder: { ondataavailable: (e: { data: Blob }) => void } }).mediaRecorder;
    mediaRecInstance.ondataavailable({ data: new Blob(['chunk1 '], { type: 'audio/webm' }) });
    mediaRecInstance.ondataavailable({ data: new Blob(['chunk2 '], { type: 'audio/webm' }) });

    const segment = await recorder.extractCurrentSegment();
    expect(segment).toBeInstanceOf(Blob);
    expect(recorder.isRecording).toBe(true);

    const text = await segment.text();
    expect(text).toContain('chunk1 chunk2 ');
  });

  it('tracks voice activity and reports whether speech occurred in the segment', async () => {
    await recorder.start(mockStream, 250);

    // Initial state: silence
    expect(recorder.hasSpeechInCurrentSegment()).toBe(false);

    // Simulate voice activity (mock RMS reading)
    (recorder as unknown as { setMockVoiceActivityForTesting?: (val: boolean) => void }).setMockVoiceActivityForTesting?.(true);

    expect(recorder.hasSpeechInCurrentSegment()).toBe(true);

    // After extracting segment, speech flag is reset for the next segment
    await recorder.extractCurrentSegment();
    expect(recorder.hasSpeechInCurrentSegment()).toBe(false);
  });

  it('does NOT stop external stream tracks upon cleanup call, preserving Zoom/Meet streams', async () => {
    await recorder.start(mockStream);
    recorder.cleanup();

    expect(mockTrack.stop).not.toHaveBeenCalled();
  });

  it('stops internal microphone tracks created via getUserMedia on cleanup', async () => {
    await recorder.start();
    recorder.cleanup();

    expect(mockTrack.stop).toHaveBeenCalled();
  });
});
