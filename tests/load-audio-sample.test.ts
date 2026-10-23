import { describe, it, expect, vi, afterEach } from "vitest";
import { loadAudioSample } from "@/audio/load-audio-sample";
afterEach(() => vi.unstubAllGlobals());

describe("bundled audio sample loading", () => {
  it("fetches and decodes the complete local asset with a bounded request", async () => {
    const bytes = new ArrayBuffer(8), buffer = { duration: 2.87 } as AudioBuffer;
    const fetch = vi.fn().mockResolvedValue({ ok: true, arrayBuffer: async () => bytes });
    vi.stubGlobal("fetch", fetch);
    const decodeAudioData = vi.fn().mockResolvedValue(buffer);
    expect(await loadAudioSample({ decodeAudioData } as unknown as BaseAudioContext, "/fire.wav")).toBe(buffer);
    expect(fetch).toHaveBeenCalledWith("/fire.wav", { signal: expect.any(AbortSignal) });
    expect(decodeAudioData).toHaveBeenCalledWith(bytes);
  });

  it("preserves the original network failure cause without synthetic fallback", async () => {
    const cause = new Error("offline");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(cause));
    await expect(loadAudioSample({} as BaseAudioContext, "/fire.wav")).rejects.toMatchObject({ cause });
  });

  it.each([0, NaN])("rejects invalid decoded duration %s", async duration => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, arrayBuffer: async () => new ArrayBuffer(0) }));
    await expect(loadAudioSample({ decodeAudioData: async () => ({ duration }) } as unknown as BaseAudioContext, "/fire.wav")).rejects.toThrow();
  });
});
