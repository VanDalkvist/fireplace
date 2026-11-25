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
function fixture(overrides: Partial<Parameters<typeof useSalonHotkeys>[0]> = {}) {
  const advance = vi.fn();
  useSalonHotkeys({ onToggleHelp:vi.fn(),onToggleZen:vi.fn(),onToggleFullscreen:vi.fn(),onTriggerTurn:vi.fn(),onPass:vi.fn(),onToggleAudio:vi.fn(),onSelectPhase:vi.fn(),onAdvancePhase:advance,...overrides });
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

describe("native keyboard controls", () => {
  it("leaves Tab and Shift+Tab to the browser and performs no global action", () => {
    const turn=vi.fn(), speech=vi.fn(), advance=fixture({onTriggerTurn:turn,onToggleSpeech:speech});
    for(const shiftKey of [false,true]){
      const preventDefault=vi.fn();key({code:"Tab",key:"Tab",shiftKey,preventDefault});expect(preventDefault).not.toHaveBeenCalled();
    }
    expect(turn).not.toHaveBeenCalled();expect(speech).not.toHaveBeenCalled();expect(advance).not.toHaveBeenCalled();
  });
  it("leaves Space and arrows to focused controls, and still triggers scene actions",()=>{
    const turn=vi.fn(),next=vi.fn();fixture({onTriggerTurn:turn,onAdvanceTurn:next});
    for(const tagName of ["BUTTON","A","SELECT"]){
      const target=Object.assign(new Element(),{tagName});const preventDefault=vi.fn();
      key({code:"Space",key:" ",target,preventDefault});key({code:"ArrowRight",key:"ArrowRight",target,preventDefault});
      expect(preventDefault).not.toHaveBeenCalled();
    }
    expect(turn).not.toHaveBeenCalled();expect(next).not.toHaveBeenCalled();
    key({code:"Space",key:" "});key({code:"ArrowRight",key:"ArrowRight"});
    expect(turn).toHaveBeenCalledTimes(1);expect(next).toHaveBeenCalledTimes(1);
  });
  it("preserves modified shortcuts and modal-local events",()=>{
    const audio=vi.fn(),speech=vi.fn();fixture({onToggleAudio:audio,onToggleSpeech:speech});
    key({code:"KeyM",key:"m",metaKey:true});
    key({code:"KeyV",key:"v",ctrlKey:true});
    key({code:"KeyV",key:"v",target:Object.assign(new Element(),{closest:()=>({})})});
    expect(audio).not.toHaveBeenCalled();expect(speech).not.toHaveBeenCalled();
    key({code:"KeyV",key:"v"});expect(speech).toHaveBeenCalledTimes(1);
  });
});
