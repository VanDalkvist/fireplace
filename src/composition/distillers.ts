import { DistillerRegistry } from "@/domain/distiller-registry";
import { distillWithNeuralFallback as distillCore, type NeuralDistillerOptions } from "@/domain/phrase-distiller";
import { getDistillerConfig, type DistillerConfig } from "@/config/distiller-config";
import { OllamaDistillerAdapter } from "@/infrastructure/ollama-distiller-adapter";
import { OpenRouterDistillerAdapter } from "@/infrastructure/openrouter-distiller-adapter";
import { PiDistillerAdapter } from "@/infrastructure/pi-distiller-adapter";
import { FallbackDistillerAdapter } from "@/infrastructure/fallback-distiller-adapter";
import { FallbackPhraseSegmenter } from "@/infrastructure/fallback-phrase-segmenter";
import { LosslessPhraseSegmenter } from "@/infrastructure/lossless-phrase-segmenter";
import { OllamaPhraseSegmenter } from "@/infrastructure/ollama-phrase-segmenter";
import { prepareDisplayPhrases } from "@/domain/prepare-display-phrases";
import type { PhraseSegmenterPort } from "@/domain/phrase-segmenter";
import { DistillationError } from "@/domain/distillation-error";

export function createDefaultDistillerRegistry(config: DistillerConfig = getDistillerConfig()): DistillerRegistry {
  const leaves = new DistillerRegistry(config.defaultEngine);
  leaves.register(new OpenRouterDistillerAdapter({ baseUrl: config.openrouter.baseUrl, defaultModel: config.openrouter.model, apiKey: config.openrouter.apiKey, defaultTimeoutMs: config.openrouter.timeoutMs }));
  leaves.register(new OllamaDistillerAdapter({ baseUrl: config.ollama.baseUrl, defaultModel: config.ollama.model, defaultTimeoutMs: config.ollama.timeoutMs }));
  leaves.register(new PiDistillerAdapter(config.pi));
  const configured = new DistillerRegistry(config.defaultEngine);
  for (const { id } of leaves.list()) {
    const ids = [id, ...(config.fallbacks[id] ?? [])];
    configured.register(new FallbackDistillerAdapter(ids.map(next => leaves.require(next))));
  }
  return configured;
}

export const defaultDistillerRegistry = createDefaultDistillerRegistry();
export function createPhraseSegmenter(config = getDistillerConfig()): PhraseSegmenterPort {
  const plugins = new Map<string, PhraseSegmenterPort>([
    ["ollama", new OllamaPhraseSegmenter(new OllamaDistillerAdapter({ baseUrl: config.ollama.baseUrl, defaultModel: config.ollama.model, defaultTimeoutMs: config.ollama.timeoutMs }))],
    ["lossless", new LosslessPhraseSegmenter()],
  ]);
  return new FallbackPhraseSegmenter(config.segmenterChain.map(id => {
    const adapter = plugins.get(id);
    if (!adapter) throw new DistillationError("configuration", `Segmenter "${id}" is not registered`);
    return adapter;
  }));
}
const segmenter = createPhraseSegmenter();
export const distillPhrase = async (source: string, options: NeuralDistillerOptions = {}, context: string[] = []) => {
  const result = await distillCore(source, {
    ...options, distillerPort: options.distillerPort ?? (options.engine ? defaultDistillerRegistry.require(options.engine) : defaultDistillerRegistry.getActive()),
  }, context);
  return prepareDisplayPhrases(result, segmenter);
};
