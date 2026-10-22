import type {
  SpeakerIdentificationPort,
  SpeakerIdentificationResult,
} from "./speaker-types";

export interface SherpaSpeakerAdapterOptions {
  serviceUrl?: string;
  timeoutMs?: number;
}

export class SherpaSpeakerAdapter implements SpeakerIdentificationPort {
  private serviceUrl: string;
  private timeoutMs: number;

  constructor(options: SherpaSpeakerAdapterOptions = {}) {
    this.serviceUrl = (options.serviceUrl || "http://127.0.0.1:8086").replace(/\/+$/, "");
    this.timeoutMs = options.timeoutMs ?? 2000;
  }

  public async isAvailable(): Promise<boolean> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 600);

    try {
      const res = await fetch(`${this.serviceUrl}/health`, {
        signal: controller.signal,
      });
      return res.ok;
    } catch (err) {
      console.warn("[SherpaSpeakerAdapter] Service unavailable:", err);
      return false;
    } finally {
      clearTimeout(timer);
    }
  }

  public async identify(audioBlob: Blob): Promise<SpeakerIdentificationResult | null> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(`${this.serviceUrl}/identify`, {
        method: "POST",
        headers: { "Content-Type": audioBlob.type || "audio/webm" },
        body: audioBlob,
        signal: controller.signal,
      });

      if (!res.ok) {
        console.warn(`[SherpaSpeakerAdapter] /identify returned HTTP ${res.status}`);
        return null;
      }

      const data = (await res.json()) as SpeakerIdentificationResult;
      return data;
    } catch (err) {
      console.warn("[SherpaSpeakerAdapter] identify call failed (graceful degradation):", err);
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  public async reset(): Promise<boolean> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(`${this.serviceUrl}/reset`, {
        method: "POST",
        signal: controller.signal,
      });
      return res.ok;
    } catch (err) {
      console.warn("[SherpaSpeakerAdapter] reset failed:", err);
      return false;
    } finally {
      clearTimeout(timer);
    }
  }

  public async getEnrolledSpeakers(): Promise<Array<{ speakerId: string; seatNumber: number }>> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(`${this.serviceUrl}/speakers`, {
        signal: controller.signal,
      });
      if (!res.ok) return [];
      const data = (await res.json()) as {
        speakers?: Array<{ speakerId: string; seatNumber: number }>;
      };
      return data.speakers || [];
    } catch (err) {
      console.warn("[SherpaSpeakerAdapter] getEnrolledSpeakers failed:", err);
      return [];
    } finally {
      clearTimeout(timer);
    }
  }
}
