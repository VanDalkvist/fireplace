import { it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { TechnicalGearPult } from "@/components/salon/TechnicalGearPult";
vi.mock("react", async original => {
  const actual = await original<typeof import("react")>();
  return { ...actual, useState: () => [true, vi.fn()] };
});
function panel(verbatim: boolean) {
  return renderToStaticMarkup(<TechnicalGearPult sttEngine="gigaam" onToggleSttEngine={vi.fn()} distillerEngine="pi" onToggleDistillerEngine={vi.fn()} isVerbatimMode={verbatim} onToggleVerbatimMode={vi.fn()} isAudioOn={false} onAudioToggle={vi.fn()} phase="silence" onPhaseSelect={vi.fn()} isDemoActive={false} onToggleDemo={vi.fn()} onResetCircle={vi.fn()} />);
}
it("shows начало / нейро and luna for the configured default Luna model without changing IDs", () => {
  const html=panel(false);
  expect(html).toContain(">начало<");
  expect(html).toContain(">нейро<");
  expect(html).toContain(">luna<");
});
it("shows фраза for uncompressed mode", () => {
  expect(panel(true)).toContain(">фраза<");
});

it("keeps pi when a different model is configured", () => {
  vi.stubGlobal("window", { location: { search: "?distiller_engine=pi&distiller_model=other-model" } });
  vi.stubGlobal("localStorage", { getItem: () => null });
  try {
    const html=panel(false);
    expect(html).toContain(">pi<");
    expect(html).not.toContain(">luna<");
  } finally { vi.unstubAllGlobals(); }
});
