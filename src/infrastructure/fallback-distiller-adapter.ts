import type { LlmCompletionRequest, LlmCompletionResponse, LlmDistillerPort } from "@/domain/distiller-types";
import { DistillationError } from "@/domain/distillation-error";

/** The only automatic LLM retry boundary. Composition supplies every attempted adapter. */
export class FallbackDistillerAdapter implements LlmDistillerPort {
  readonly id: string;
  readonly name: string;
  constructor(private readonly chain: readonly LlmDistillerPort[]) {
    if (!chain.length || new Set(chain.map(adapter => adapter.id)).size !== chain.length) {
      throw new DistillationError("configuration", "Invalid distiller fallback chain");
    }
    this.id = chain[0].id;
    this.name = chain[0].name;
  }

  async complete(req: LlmCompletionRequest, timeoutMs?: number, validate?: (content: string) => void): Promise<LlmCompletionResponse> {
    const deadline = timeoutMs === undefined ? undefined : Date.now() + timeoutMs;
    const failures: unknown[] = [];
    for (const adapter of this.chain) {
      const remaining = deadline === undefined ? undefined : deadline - Date.now();
      if (remaining !== undefined && remaining <= 0) break;
      try {
        const request = adapter === this.chain[0] ? req : { ...req, model: undefined };
        const result = await adapter.complete(request, remaining);
        if (!result?.content) throw new DistillationError("unavailable", "Adapter returned no content");
        validate?.(result.content);
        return { ...result, adapterId: adapter.id };
      } catch (cause) {
        failures.push(cause);
        console.warn("[FallbackDistillerAdapter]", { event: "adapter_failed", adapter: adapter.id, outcome: "failed" });
      }
    }
    throw new DistillationError("unavailable", "Configured distiller chain exhausted", { cause: new AggregateError(failures) });
  }

  async checkHealth(): Promise<{ online: boolean; model: string }> {
    for (const adapter of this.chain) {
      const status = await adapter.checkHealth();
      if (status.online) return status;
    }
    return { online: false, model: this.id };
  }
}
