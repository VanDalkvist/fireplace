import { describe, it, expect, vi } from "vitest";
import { NaturalFireAdapter } from "@/audio/natural-fire-adapter";
import { audioFixture } from "./audio-effects-fixture";

const buffer = { duration: 2.870612 } as AudioBuffer;

describe("natural fire effects", () => {
  it("plays one bounded nonlooping recorded source with envelope and once-only loading", async () => {
    const f = audioFixture(), load = vi.fn().mockResolvedValue(buffer);
    const effect = new NaturalFireAdapter(load, () => 0);
    await effect.prepare(f.context);
    await effect.play(f.context, f.output);
    expect(load).toHaveBeenCalledTimes(1);
    expect(f.sources).toHaveLength(1);
    const voice = f.sources[0];
    expect(voice.buffer).toBe(buffer);
    expect(voice.loop).toBe(false);
    expect(voice.playbackRate.value).toBeGreaterThanOrEqual(0.98);
    const [when, offset, duration] = voice.start.mock.calls[0];
    expect(offset + duration).toBeLessThanOrEqual(buffer.duration);
    expect(duration / voice.playbackRate.value).toBeLessThanOrEqual(3);
    expect(voice.stop).toHaveBeenCalledWith(expect.closeTo(when + duration / voice.playbackRate.value + 0.02));
    expect(f.gains[0].gain.linearRampToValueAtTime).toHaveBeenLastCalledWith(0, expect.any(Number));
    expect(f.runtime.createOscillator).not.toHaveBeenCalled();
  });

  it("enters softly at lower gain before fading out, without an early level jump", async () => {
    const f = audioFixture(), effect = new NaturalFireAdapter(async () => buffer, () => 0);
    await effect.play(f.context, f.output);
    const start = f.sources[0].start.mock.calls[0][0];
    const ramps = f.gains[0].gain.linearRampToValueAtTime.mock.calls;
    expect(ramps[0][0]).toBeLessThanOrEqual(0.35);
    expect(ramps[0][1] - start).toBeGreaterThanOrEqual(0.55);
    expect(f.gains[0].gain.setValueAtTime.mock.calls).toEqual([[0, start]]);
    expect(ramps.at(-1)?.[0]).toBe(0);
  });

  it("coalesces concurrent fragments and limits active voices to two", async () => {
    const f = audioFixture(), effect = new NaturalFireAdapter(async () => buffer, () => 0);
    await Promise.all(Array.from({ length: 12 }, () => effect.play(f.context, f.output)));
    expect(f.sources).toHaveLength(1);
    f.runtime.currentTime += 0.8;
    await effect.play(f.context, f.output);
    f.runtime.currentTime += 0.8;
    await effect.play(f.context, f.output);
    expect(f.sources).toHaveLength(2);
    expect(f.sources[0].start.mock.calls[0][1]).not.toBe(f.sources[1].start.mock.calls[0][1]);
  });

  it("cancels late playback when muted during loading, without stopping the shared context", async () => {
    const f = audioFixture();
    let complete: (value: AudioBuffer) => void = () => { throw new Error("Loader not called"); };
    const effect = new NaturalFireAdapter(() => new Promise(resolve => { complete = resolve; }));
    const play = effect.play(f.context, f.output);
    effect.stop();
    complete(buffer);
    await play;
    expect(f.sources).toHaveLength(0);
    await effect.play(f.context, f.output);
    expect(f.sources).toHaveLength(1);
  });

  it("fades stopped voices and disconnects every node on ended", async () => {
    const f = audioFixture(), effect = new NaturalFireAdapter(async () => buffer);
    await effect.play(f.context, f.output);
    effect.stop();
    expect(f.sources[0].stop).toHaveBeenLastCalledWith(f.runtime.currentTime + 0.04);
    expect(f.gains[0].gain.setTargetAtTime).toHaveBeenCalledWith(0, f.runtime.currentTime, 0.008);
    f.sources[0].onended?.();
    expect(f.sources[0].disconnect).toHaveBeenCalledTimes(1);
    expect(f.gains[0].disconnect).toHaveBeenCalledTimes(1);
    await effect.play(f.context, f.output);
    expect(f.sources).toHaveLength(2);
  });

  it("exposes loading failure and retries only on a new explicit call", async () => {
    const failure = new Error("unavailable"), load = vi.fn().mockRejectedValueOnce(failure).mockResolvedValue(buffer);
    const f = audioFixture(), effect = new NaturalFireAdapter(load);
    await expect(effect.prepare(f.context)).rejects.toBe(failure);
    expect(f.sources).toHaveLength(0);
    expect(load).toHaveBeenCalledTimes(1);
    await effect.play(f.context, f.output);
    expect(f.sources).toHaveLength(1);
  });
});
