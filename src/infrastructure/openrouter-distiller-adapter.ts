import type { LlmDistillerPort, LlmCompletionRequest, LlmCompletionResponse } from "@/domain/distiller-types";

export interface OpenRouterAdapterOptions {
  baseUrl?: string;
  defaultModel?: string;
  apiKey?: string;
  defaultTimeoutMs?: number;
}

interface OpenRouterCompletionPayload {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  response?: string;
  model?: string;
  error?: {
    message?: string;
    code?: number;
  };
}

export class OpenRouterDistillerAdapter implements LlmDistillerPort {
  public readonly id = "openrouter";
  public readonly name = "OpenRouter";
  private baseUrl: string;
  private defaultModel: string;
  private apiKey?: string;
  private defaultTimeoutMs: number;

  constructor(options: OpenRouterAdapterOptions = {}) {
    this.baseUrl = (options.baseUrl || "/api/openrouter").replace(/\/+$/, "");
    this.defaultModel = options.defaultModel || "openrouter/free";
    this.apiKey = options.apiKey;
    this.defaultTimeoutMs = options.defaultTimeoutMs ?? 8000;
  }

  public async complete(
    req: LlmCompletionRequest,
    timeoutMs?: number
  ): Promise<LlmCompletionResponse | null> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs ?? this.defaultTimeoutMs);
    const targetModel = req.model || this.defaultModel;

    const messages: Array<{ role: "system" | "user"; content: string }> = [];
    if (req.systemPrompt) {
      messages.push({ role: "system", content: req.systemPrompt });
    }
    messages.push({ role: "user", content: req.prompt });

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "HTTP-Referer": "http://127.0.0.1:4343",
      "X-Title": "Salon Presence",
    };
    if (this.apiKey) {
      headers["Authorization"] = `Bearer ${this.apiKey}`;
    }

    const endpoint = this.baseUrl.endsWith("/chat/completions")
      ? this.baseUrl
      : `${this.baseUrl}/chat/completions`;

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers,
        signal: controller.signal,
        body: JSON.stringify({
          model: targetModel,
          messages,
          temperature: req.temperature ?? 0.1,
          max_tokens: req.maxTokens ?? 350,
          reasoning: { max_tokens: 0 },
          response_format: req.jsonFormat ? { type: "json_object" } : undefined,
        }),
      });

      if (!res.ok) {
        console.warn(`[OpenRouterDistillerAdapter] Upstream returned HTTP ${res.status}`);
        return null;
      }

      const data = (await res.json()) as OpenRouterCompletionPayload;
      const content = data.choices?.[0]?.message?.content?.trim() || data.response?.trim();
      if (!content) {
        console.warn("[OpenRouterDistillerAdapter] Empty response content from upstream");
        return null;
      }

      return {
        content,
        modelUsed: data.model || targetModel,
      };
    } catch (err) {
      console.warn("[OpenRouterDistillerAdapter] Request failed:", err);
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  public async checkHealth(): Promise<{ online: boolean; model: string }> {
    try {
      const pingRes = await this.complete({
        prompt: "Скажи одним словом: жив",
        maxTokens: 5,
        temperature: 0.1,
      }, 4000);
      return {
        online: Boolean(pingRes?.content),
        model: pingRes?.modelUsed || this.defaultModel,
      };
    } catch {
      return {
        online: false,
        model: this.defaultModel,
      };
    }
  }
}
