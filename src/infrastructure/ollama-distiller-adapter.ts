import type { LlmDistillerPort, LlmCompletionRequest, LlmCompletionResponse } from "@/domain/distiller-types";
import { OllamaClient } from "./ollama-client";

export interface OllamaDistillerAdapterOptions {
  baseUrl?: string;
  defaultModel?: string;
  defaultTimeoutMs?: number;
}

export class OllamaDistillerAdapter implements LlmDistillerPort {
  public readonly id = "ollama";
  public readonly name = "Ollama Local";
  private client: OllamaClient;
  private defaultModel: string;
  private defaultTimeoutMs: number;

  constructor(options: OllamaDistillerAdapterOptions = {}) {
    this.client = new OllamaClient(options.baseUrl || "http://127.0.0.1:11434");
    this.defaultModel = options.defaultModel || "qwen2.5:1.5b";
    this.defaultTimeoutMs = options.defaultTimeoutMs ?? 4500;
  }

  public async complete(
    req: LlmCompletionRequest,
    timeoutMs?: number
  ): Promise<LlmCompletionResponse | null> {
    const model = req.model || this.defaultModel;
    const prompt = req.systemPrompt ? `${req.systemPrompt}\n\n${req.prompt}` : req.prompt;

    const data = await this.client.generate(
      {
        model,
        prompt,
        format: req.jsonFormat ? "json" : undefined,
        stream: false,
        keep_alive: "1h",
        options: {
          temperature: req.temperature ?? 0.15,
          num_predict: req.maxTokens ?? 96,
        },
      },
      timeoutMs ?? this.defaultTimeoutMs
    );

    if (!data?.response) return null;
    return {
      content: data.response,
      modelUsed: model,
    };
  }

  public async checkHealth(): Promise<{ online: boolean; model: string }> {
    const status = await this.client.checkStatus(this.defaultModel);
    return {
      online: status.online && status.hasModel,
      model: this.defaultModel,
    };
  }
}
