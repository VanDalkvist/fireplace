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

      public start(): void {
        this.state = 'recording';
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

  it('cleans up stream tracks upon cleanup call', async () => {
    await recorder.start(mockStream);
    recorder.cleanup();

    expect(mockTrack.stop).toHaveBeenCalled();
  });
});
