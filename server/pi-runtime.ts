import { ModelRuntime } from "@earendil-works/pi-coding-agent";
import type { LlmCompletionResponse } from "../src/domain/distiller-types.ts";

export interface PiCompletionRequest {
  prompt: string; systemPrompt?: string; model: string; maxTokens: number;
}
export interface PiRuntimePort {
  complete(request: PiCompletionRequest, signal: AbortSignal): Promise<LlmCompletionResponse>;
  health(): Promise<{ online: boolean; model: string }>;
}

/** Uses Pi's provider/OAuth boundary only; no agent, tools, project discovery, or saved conversation. */
export function createPiRuntime(): PiRuntimePort {
  let runtimePromise: Promise<ModelRuntime> | undefined;
  const getRuntime = () => runtimePromise ??= ModelRuntime.create();
  return {
    async complete(request, signal) {
      const runtime = await getRuntime();
      const model = runtime.getModel("openai-codex", request.model);
      if (!model || model.type !== "chat") throw new Error("Codex chat model unavailable");
      const result = await runtime.completeSimple(model, {
        systemPrompt: request.systemPrompt,
        messages: [{ role: "user", content: request.prompt, timestamp: Date.now() }],
      }, { reasoning: "minimal", maxTokens: request.maxTokens, signal });
      if (result.stopReason !== "stop") throw new Error("Pi completion did not finish successfully");
      const content = result.content.filter(block => block.type === "text").map(block => block.text).join("");
      if (!content.trim()) throw new Error("Pi returned empty content");
      return { content, modelUsed: model.id };
    },
    async health() {
      const runtime = await getRuntime();
      const available = await runtime.getAvailable("openai-codex");
      return { online: available.some(model => model.id === "gpt-6-luna"), model: "gpt-6-luna" };
    },
  };
}
