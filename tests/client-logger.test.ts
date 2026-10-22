import { describe, it, expect, vi, beforeEach } from "vitest";
import { clientLogger } from "../src/infrastructure/client-logger";

describe("ClientLogger", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("formats and dispatches logs via beacon or fetch without throwing", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response());

    expect(() => {
      clientLogger.info("Test message", { foo: "bar" });
      clientLogger.warn("Warning message");
      clientLogger.error("Error occurred", new Error("test error"));
    }).not.toThrow();

    expect(fetchSpy).toHaveBeenCalled();
  });
});
