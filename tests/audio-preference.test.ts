import { describe, it, expect, vi } from "vitest";
import { readAudioEnabled, writeAudioEnabled } from "@/infrastructure/audio-preference";
describe("persistent sound toggle", () => {
  it("restores the chosen enabled value, not a fresh false default", () => {
    expect(readAudioEnabled({getItem:()=> "true",setItem:vi.fn()})).toBe(true);
  });
  it("writes both explicit on and off choices", () => {
    const storage={getItem:()=>null,setItem:vi.fn()};
    writeAudioEnabled(true,storage);writeAudioEnabled(false,storage);
    expect(storage.setItem.mock.calls).toEqual([["salon_audio_enabled","true"],["salon_audio_enabled","false"]]);
  });
  it("defaults to silent for absent or invalid preference", () => {
    for(const value of [null,"invalid","false"]) expect(readAudioEnabled({getItem:()=>value,setItem:vi.fn()})).toBe(false);
  });
});
