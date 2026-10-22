import { clientLogger } from "@/infrastructure/client-logger";

export interface OpenAiSpeechStatus {
  online: boolean;
  modelId?: string;
  provider?: string;
}

export interface OpenAiTranscribeOptions {
  baseUrl?: string;
  model?: string;
  language?: string;
  timeoutMs?: number;
}

export async function checkOpenAiSpeechStatus(
  baseUrl = "http://127.0.0.1:9876"
): Promise<OpenAiSpeechStatus> {
  const cleanUrl = baseUrl.replace(/\/+$/, "");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 800);

  try {
    // 1. Try /ready or /v1/models (gigastt & standard OpenAI gateways)
    const res = await fetch(`${cleanUrl}/ready`, {
      method: "GET",
      signal: controller.signal,
    }).catch(() => null);

    if (res && (res.ok || res.status === 200)) {
      clearTimeout(timer);
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      return {
        online: true,
        modelId: typeof data.model === "string" ? data.model : undefined,
      };
    }

    // 2. Try root endpoint / (whisper.cpp)
    const rootRes = await fetch(`${cleanUrl}/`, {
      method: "GET",
      signal: controller.signal,
    });
    clearTimeout(timer);
    return { online: rootRes.ok || rootRes.status === 200 || rootRes.status === 405 };
  } catch (err) {
    clearTimeout(timer);
    return { online: false };
  }
}

export async function transcribeAudioBlobOpenAi(
  audioBlob: Blob,
  options: OpenAiTranscribeOptions = {}
): Promise<string> {
  const baseUrl = (options.baseUrl ?? "http://127.0.0.1:9876").replace(/\/+$/, "");
  const timeoutMs = options.timeoutMs ?? 7000;
  const language = options.language ?? "ru";
  const model = options.model ?? "whisper-1";

  // Determine file extension from Blob mimeType
  const ext = audioBlob.type.includes("wav") ? "wav" : "webm";
  const formData = new FormData();
  formData.append("file", audioBlob, `speech.${ext}`);
  formData.append("model", model);
  formData.append("language", language);
  formData.append("response_format", "json");
  formData.append("temperature", "0.0");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // Standard OpenAI Audio API endpoint
    let res = await fetch(`${baseUrl}/v1/audio/transcriptions`, {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });

    // Fallback: whisper.cpp server legacy endpoint /inference if 404
    if (res.status === 404) {
      clientLogger.info(
        `[OpenAiSpeechClient] /v1/audio/transcriptions not found on ${baseUrl}, trying /inference fallback`
      );
      res = await fetch(`${baseUrl}/inference`, {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });
    }

    clearTimeout(timer);

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      clientLogger.error(`ASR server failed with HTTP ${res.status}`, {
        status: res.status,
        body: errText,
        baseUrl,
        blobSize: audioBlob.size,
      });
      throw new Error(`ASR server responded with HTTP ${res.status}${errText ? `: ${errText}` : ""}`);
    }

    const data = (await res.json()) as { text?: string };
    return (data.text || "").trim();
  } catch (err) {
    clearTimeout(timer);
    clientLogger.warn(`transcribeAudioBlobOpenAi error: ${err instanceof Error ? err.message : String(err)}`);
    throw err;
  }
}
