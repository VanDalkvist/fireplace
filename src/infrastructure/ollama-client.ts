export interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  format?: string;
  stream?: boolean;
  keep_alive?: string | number;
  options?: {
    temperature?: number;
    num_predict?: number;
  };
}

export interface OllamaClientOptions {
  baseUrl?: string;
  timeoutMs?: number;
}

export class OllamaClient {
  private baseUrl: string;

  constructor(baseUrl = "http://127.0.0.1:11434") {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
  }

  public async generate(
    req: OllamaGenerateRequest,
    timeoutMs = 2000
  ): Promise<{ response?: string } | null> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(`${this.baseUrl}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify(req),
      });

      if (!res.ok) {
        console.warn(`[OllamaClient] generate returned HTTP ${res.status}`);
        return null;
      }

      return (await res.json()) as { response?: string };
    } catch (err) {
      console.warn("[OllamaClient] generate call failed:", err);
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  public async checkStatus(
    targetModel = "qwen2.5:1.5b",
    timeoutMs = 1500
  ): Promise<{ online: boolean; hasModel: boolean }> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(`${this.baseUrl}/api/tags`, {
        signal: controller.signal,
      });

      if (!res.ok) {
        return { online: false, hasModel: false };
      }

      const data = (await res.json()) as { models?: Array<{ name: string }> };
      const hasModel = Boolean(data.models?.some((m) => m.name.includes(targetModel)));
      return { online: true, hasModel };
    } catch (err) {
      console.warn("[OllamaClient] checkStatus call failed:", err);
      return { online: false, hasModel: false };
    } finally {
      clearTimeout(timer);
    }
  }
}
