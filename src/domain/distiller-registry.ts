import type { LlmDistillerPort } from "./distiller-types";
import { DistillationError } from "./distillation-error";

export class DistillerRegistry {
  private adapters = new Map<string, LlmDistillerPort>();
  constructor(private activeId = "openrouter") {}
  register(adapter: LlmDistillerPort): void { this.adapters.set(adapter.id, adapter); }
  get(id: string): LlmDistillerPort | undefined { return this.adapters.get(id); }
  require(id: string): LlmDistillerPort {
    const adapter = this.adapters.get(id);
    if (!adapter) throw new DistillationError("configuration", `Distiller adapter "${id}" is not registered`);
    return adapter;
  }
  getActive(): LlmDistillerPort { return this.require(this.activeId); }
  setActive(id: string): void { this.require(id); this.activeId = id; }
  list(): Array<{ id: string; name: string }> {
    return [...this.adapters.values()].map(adapter => ({ id: adapter.id, name: adapter.name }));
  }
}
