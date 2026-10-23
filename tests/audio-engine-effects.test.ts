import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from "vitest";
import type { SoundEffectsPort } from "@/audio/sound-effects-port";
import { SalonAudioEngine } from "@/audio/audio-engine";
import { audioFixture } from "./audio-effects-fixture";

const flush = async () => { for (let index = 0; index < 6; index++) await Promise.resolve(); };

describe("Salon audio effects boundary", () => {
  let f: ReturnType<typeof audioFixture>;
  let effects: { prepare: Mock<SoundEffectsPort["prepare"]>; play: Mock<SoundEffectsPort["play"]>; stop: Mock<SoundEffectsPort["stop"]> };
  let failure: Mock<(error: unknown) => void>;
  let engine: SalonAudioEngine;
  beforeEach(() => {
    f = audioFixture();
    effects = { prepare: vi.fn<SoundEffectsPort["prepare"]>().mockResolvedValue(undefined), play: vi.fn<SoundEffectsPort["play"]>().mockResolvedValue(undefined), stop: vi.fn<SoundEffectsPort["stop"]>() };
    failure = vi.fn<(error: unknown) => void>();
    vi.stubGlobal("window", { AudioContext: function () { return f.context; } });
    vi.spyOn(console, "warn").mockImplementation(() => {});
    engine = new SalonAudioEngine(effects, failure);
  });
  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  it("starts silent and does not load or play before user enable", () => {
    engine.playFeeling("радость"); engine.playDesire();
    expect(effects.prepare).not.toHaveBeenCalled();
    expect(effects.play).not.toHaveBeenCalled();
    expect(engine.active).toBe(false);
  });

  it("prepares on enable but plays only on utterance callbacks, never an oscillator", async () => {
    expect(engine.toggle()).toBe(true);
    await flush();
    expect(effects.prepare).toHaveBeenCalledWith(f.context);
    expect(effects.play).not.toHaveBeenCalled();
    engine.playFeeling("радость", 0.5); engine.playDesire();
    await flush();
    expect(effects.play).toHaveBeenCalledTimes(2);
    expect(f.runtime.createOscillator).not.toHaveBeenCalled();
  });

  it("retains master volume control and stops effects when muted or passed", async () => {
    engine.toggle(); await flush();
    engine.setVolume(0.3);
    expect(f.gains[0].gain.setTargetAtTime).toHaveBeenLastCalledWith(0.24, f.runtime.currentTime, 0.2);
    engine.playPass();
    expect(effects.stop).toHaveBeenCalledTimes(1);
    expect(engine.toggle()).toBe(false);
    expect(effects.stop).toHaveBeenCalledTimes(2);
    engine.playDesire(); await flush();
    expect(effects.play).not.toHaveBeenCalled();
  });

  it("waits for suspended context resume before preparing", async () => {
    f.runtime.state = "suspended";
    let resumed: () => void = () => { throw new Error("Resume not started"); };
    f.runtime.resume.mockImplementation(() => new Promise<void>(resolve => { resumed = resolve; }));
    engine.toggle();
    expect(effects.prepare).not.toHaveBeenCalled();
    resumed(); await flush();
    expect(effects.prepare).toHaveBeenCalledTimes(1);
  });

  it("disables and reports a loading failure without any musical fallback", async () => {
    const error = new Error("sample unavailable");
    effects.prepare.mockRejectedValue(error);
    engine.toggle(); await flush();
    expect(engine.active).toBe(false);
    expect(failure).toHaveBeenCalledWith(error);
    expect(effects.stop).toHaveBeenCalled();
    expect(f.runtime.createOscillator).not.toHaveBeenCalled();
  });

  it("ignores stale preparation failure after a user mute", async () => {
    let reject: (error: Error) => void = () => { throw new Error("Prepare not called"); };
    effects.prepare.mockImplementation(() => new Promise((_resolve, fail) => { reject = fail; }));
    engine.toggle(); await flush();
    engine.toggle(); reject(new Error("late failure")); await flush();
    expect(failure).not.toHaveBeenCalled();
    expect(engine.active).toBe(false);
  });

  it("surfaces playback rejection and leaves audio disabled for explicit retry", async () => {
    const error = new Error("playback failed");
    effects.play.mockRejectedValue(error);
    engine.toggle(); await flush(); engine.playDesire(); await flush();
    expect(failure).toHaveBeenCalledWith(error);
    expect(engine.active).toBe(false);
  });
});
