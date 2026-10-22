import type { LlmDistillerPort } from "./distiller-types";
import { OllamaDistillerAdapter } from "@/infrastructure/ollama-distiller-adapter";
import { OpenRouterDistillerAdapter } from "@/infrastructure/openrouter-distiller-adapter";
import { getDistillerConfig, type DistillerConfig } from "@/config/distiller-config";

export class DistillerRegistry {
  private adapters = new Map<string, LlmDistillerPort>();
  private activeId: string;

  constructor(defaultActiveId = "openrouter") {
    this.activeId = defaultActiveId;
  }

  public register(adapter: LlmDistillerPort): void {
    this.adapters.set(adapter.id, adapter);
  }

  public get(id: string): LlmDistillerPort | undefined {
    return this.adapters.get(id);
  }

  public getActive(): LlmDistillerPort {
    const active = this.adapters.get(this.activeId);
    if (active) return active;
    const first = this.adapters.values().next().value;
    if (first) return first;
    throw new Error("No distiller adapters registered");
  }

  public setActive(id: string): void {
    if (!this.adapters.has(id)) {
      throw new Error(`Distiller adapter with id "${id}" not registered`);
    }
    this.activeId = id;
  }

  public list(): Array<{ id: string; name: string }> {
    return Array.from(this.adapters.values()).map((a) => ({ id: a.id, name: a.name }));
  }
}

export function createDefaultDistillerRegistry(config: DistillerConfig = getDistillerConfig()): DistillerRegistry {
  const registry = new DistillerRegistry(config.defaultEngine);

  const openRouterAdapter = new OpenRouterDistillerAdapter({
    baseUrl: config.openrouter.baseUrl,
    defaultModel: config.openrouter.model,
    apiKey: config.openrouter.apiKey,
    defaultTimeoutMs: config.openrouter.timeoutMs,
  });

  const ollamaAdapter = new OllamaDistillerAdapter({
    baseUrl: config.ollama.baseUrl,
    defaultModel: config.ollama.model,
    defaultTimeoutMs: config.ollama.timeoutMs,
  });

  registry.register(openRouterAdapter);
  registry.register(ollamaAdapter);

  return registry;
}

export const defaultDistillerRegistry = createDefaultDistillerRegistry();
