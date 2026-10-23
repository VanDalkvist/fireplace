import { vi } from "vitest";

const param = () => ({ value: 0, cancelScheduledValues: vi.fn(), setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), setTargetAtTime: vi.fn() });
const node = () => ({ connect: vi.fn(), disconnect: vi.fn() });
type Source = ReturnType<typeof source>;
const gainNode = () => ({ ...node(), gain: param() });
const source = () => ({ ...node(), buffer: null as AudioBuffer | null, loop: true, playbackRate: { value: 1 }, start: vi.fn(), stop: vi.fn(), onended: null as (() => void) | null });

export function audioFixture() {
  const sources: Source[] = [];
  const gains: Array<ReturnType<typeof gainNode>> = [];
  function gain() { const value = gainNode(); gains.push(value); return value; }
  const runtime = {
    currentTime: 1, state: "running" as AudioContextState,
    destination: node(), resume: vi.fn().mockResolvedValue(undefined),
    createGain: vi.fn(gain),
    createBiquadFilter: vi.fn(() => ({ ...node(), type: "", frequency: { value: 0 } })),
    createBufferSource: vi.fn(() => { const value = source(); sources.push(value); return value; }),
    createOscillator: vi.fn(() => { throw new Error("Musical oscillator must not be used"); }),
    createDynamicsCompressor: vi.fn(() => ({ ...node(), threshold: {}, knee: {}, ratio: {}, attack: {}, release: {} })),
  };
  return { context: runtime as unknown as AudioContext, output: node() as unknown as AudioNode, runtime, sources, gains };
}
