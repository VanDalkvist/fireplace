import { it, expect, vi, afterEach } from "vitest";
import { SalonMotionEngine } from "@/canvas/motion-engine";
import { HearthFlameSimulator } from "@/canvas/hearth-flame";
afterEach(()=>vi.restoreAllMocks());
it("gives a stronger bounded existing flare without creating tokens or participants",()=>{
  const flare=vi.spyOn(HearthFlameSimulator.prototype,"triggerWordFlare").mockImplementation(()=>{});
  const engine=new SalonMotionEngine();engine.resize(1280,800);engine.currentHeat=.2;
  const beforeWords=engine.words.words.length, beforePeople=engine.seats.seats.length;
  engine.pulsePhaseChange?.();
  expect(engine.currentHeat).toBeCloseTo(.55);
  expect(flare).toHaveBeenCalledTimes(2);
  expect(flare).toHaveBeenLastCalledWith(640,400);
  expect(engine.words.words).toHaveLength(beforeWords);
  expect(engine.seats.seats).toHaveLength(beforePeople);
});
it("caps the cue at existing maximum heat",()=>{
  vi.spyOn(HearthFlameSimulator.prototype,"triggerWordFlare").mockImplementation(()=>{});
  const engine=new SalonMotionEngine();engine.resize(1280,800);engine.currentHeat=.9;
  engine.pulsePhaseChange?.();expect(engine.currentHeat).toBe(1);
});
it("never emits a phase flare at the uninitialized top-left corner",()=>{
  const flare=vi.spyOn(HearthFlameSimulator.prototype,"triggerWordFlare").mockImplementation(()=>{});
  const engine=new SalonMotionEngine();engine.pulsePhaseChange?.();
  expect(flare).not.toHaveBeenCalled();expect(engine.currentHeat).toBe(0);
});
