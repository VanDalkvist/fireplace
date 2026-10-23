import type { LlmCompletionRequest, LlmCompletionResponse, LlmDistillerPort } from "@/domain/distiller-types";

export class PiDistillerAdapter implements LlmDistillerPort {
  readonly id = "pi";
  readonly name = "Pi · Codex";
  constructor(private options: { baseUrl?: string; model?: string; timeoutMs?: number } = {}) {}

  async complete(req: LlmCompletionRequest, timeoutMs = this.options.timeoutMs ?? 12000): Promise<LlmCompletionResponse | null> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(`${this.options.baseUrl ?? "/api/pi"}/complete`, {
        method: "POST", headers: { "Content-Type": "application/json" }, signal: controller.signal,
        body: JSON.stringify({
          prompt: req.prompt, systemPrompt: req.systemPrompt, model: req.model ?? this.options.model ?? "gpt-6-luna",
          maxTokens: req.maxTokens ?? 1000, temperature: req.temperature, jsonFormat: req.jsonFormat,
        }),
      });
      if (!response.ok) return null;
      const data: unknown = await response.json();
      if (!data || typeof data !== "object") return null;
      const result = data as Record<string, unknown>;
      return typeof result.content === "string" && result.content.trim() && typeof result.modelUsed === "string"
        ? { content: result.content, modelUsed: result.modelUsed } : null;
    } catch (cause) {
      console.warn("[PiDistillerAdapter]", { event: "completion_failed", outcome: "failed", type: cause instanceof Error ? cause.name : "unknown" });
      return null;
    } finally { clearTimeout(timer); }
  }

  async checkHealth(): Promise<{ online: boolean; model: string }> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    try {
      const response = await fetch(`${this.options.baseUrl ?? "/api/pi"}/health`, { signal: controller.signal });
      const data = await response.json() as { online?: unknown; model?: unknown };
      return { online: response.ok && data.online === true, model: typeof data.model === "string" ? data.model : this.options.model ?? "gpt-6-luna" };
    } catch (cause) {
      console.warn("[PiDistillerAdapter]", { event: "health_failed", type: cause instanceof Error ? cause.name : "unknown" });
      return { online: false, model: this.options.model ?? "gpt-6-luna" };
    } finally { clearTimeout(timer); }
  }
}
