import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { useSalonHotkeys } from "@/hooks/useSalonHotkeys";
import { advancePhase, createInitialState } from "@/domain/session-fsm";
vi.mock("react", () => ({ useEffect: (effect: () => void) => effect() }));
class Element { isContentEditable = false; tagName = "DIV"; }
let handler: (event: KeyboardEvent) => void;
beforeEach(() => {
  vi.stubGlobal("HTMLInputElement", class extends Element {});
  vi.stubGlobal("HTMLTextAreaElement", class extends Element {});
  vi.stubGlobal("HTMLElement", Element);
  vi.stubGlobal("window", { addEventListener: (_name: string, callback: typeof handler) => { handler = callback; }, removeEventListener: vi.fn() });
});
afterEach(() => vi.unstubAllGlobals());
function fixture() {
  const advance = vi.fn();
  useSalonHotkeys({ onTogglePult:vi.fn(),onToggleHelp:vi.fn(),onToggleZen:vi.fn(),onToggleFullscreen:vi.fn(),onTriggerTurn:vi.fn(),onPass:vi.fn(),onToggleAudio:vi.fn(),onSelectPhase:vi.fn(),onAdvancePhase:advance });
  return advance;
}
function key(extra: object = {}) { handler({code:"KeyN",key:"т",target:null,repeat:false,preventDefault:vi.fn(),...extra} as unknown as KeyboardEvent); }
describe("discreet next phase shortcut", () => {
  it("advances on the physical N key in either keyboard layout", () => {
    const advance=fixture();key();key({key:"n"});expect(advance).toHaveBeenCalledTimes(2);
  });
  it("never advances on held repeat, modifiers, editable fields or a select", () => {
    const advance=fixture();for(const extra of [{repeat:true},{ctrlKey:true},{metaKey:true},{altKey:true},{shiftKey:true},{isComposing:true},{defaultPrevented:true},{target:Object.assign(new Element(),{isContentEditable:true})},{target:Object.assign(new Element(),{tagName:"SELECT"})}]) key(extra);
    expect(advance).not.toHaveBeenCalled();
  });
  it("uses the existing ordered terminal phase transition without changing content or participants", () => {
    let state=createInitialState(2);const people=state.participants,feelings=state.feelings;
    for(const phase of ["feelings","desires","completion","completion"]){state=advancePhase(state);expect(state.phase).toBe(phase);expect(state.participants).toBe(people);expect(state.feelings).toBe(feelings);}
  });
});
