import { beforeEach, afterEach, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PhaseNotice } from "@/components/salon/PhaseNotice";
import type { SessionPhase } from "@/domain/types";
let cells: unknown[] = [], cursor = 0, pending: (() => void)[] = [];
type EffectCell = { deps: unknown[]; cleanup?: () => void };
vi.mock("react", async original => {
  const actual = await original<typeof import("react")>();
  return { ...actual,
    useRef: (initial: unknown) => { const i=cursor++; cells[i]??={current:initial}; return cells[i]; },
    useState: (initial: unknown) => { const i=cursor++; if(!(i in cells))cells[i]=initial; return [cells[i], (next: unknown)=>{cells[i]=next;}]; },
    useEffect: (effect:()=>void|(()=>void),deps:unknown[]) => {
      const i=cursor++,prior=cells[i] as EffectCell|undefined;
      if(prior&&deps.every((value,j)=>Object.is(value,prior.deps[j])))return;
      const cell:EffectCell={deps};cells[i]=cell;
      pending.push(()=>{prior?.cleanup?.();const cleanup=effect();if(cleanup)cell.cleanup=cleanup;});
    },
  };
});
beforeEach(()=>{cells=[];cursor=0;pending=[];vi.useFakeTimers();});
afterEach(()=>{for(const cell of cells)(cell as EffectCell|null)?.cleanup?.();vi.useRealTimers();});
function render(phase: SessionPhase, callback=vi.fn()) {
  cursor=0;PhaseNotice({phase,onTransition:callback});while(pending.length)pending.shift()!();
  cursor=0;const tree=PhaseNotice({phase,onTransition:callback});while(pending.length)pending.shift()!();
  return renderToStaticMarkup(tree);
}
it("does not announce initial or restored phase",()=>{
  const cue=vi.fn();expect(render("desires",cue)).not.toContain("data-phase-notice");expect(cue).not.toHaveBeenCalled();
});
it("announces a real phase change once, despite callback rerenders, then disappears",()=>{
  const cue=vi.fn();render("silence",cue);
  expect(render("feelings",cue)).toContain("чувства");expect(cue).toHaveBeenCalledTimes(1);
  render("feelings",vi.fn());vi.advanceTimersByTime(4001);
  expect(render("feelings")).not.toContain("data-phase-notice");
});
it("replaces the notice safely and cancels the previous timeout",()=>{
  render("silence");render("feelings");vi.advanceTimersByTime(1000);
  expect(render("desires")).toContain("желания");vi.advanceTimersByTime(3001);
  expect(render("desires")).toContain("желания");vi.advanceTimersByTime(1000);
  expect(render("desires")).not.toContain("data-phase-notice");
});
