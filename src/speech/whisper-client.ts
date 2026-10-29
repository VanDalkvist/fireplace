import { clientLogger } from "@/infrastructure/client-logger";

export interface WhisperStatus {
  online: boolean;
}

export interface WhisperTranscribeOptions {
  url?: string;
  timeoutMs?: number;
  language?: string;
}

export async function checkWhisperStatus(url = "http://127.0.0.1:8085"): Promise<WhisperStatus> {
  try {
    const res = await fetch(url, { method: "GET", signal: AbortSignal.timeout(500) });
    return { online: res.ok || res.status === 200 || res.status === 405 };
  } catch (err) {
    console.warn("[WhisperClient] checkWhisperStatus failed:", err);
    return { online: false };
  }
}

export async function transcribeAudioBlob(
  audioBlob: Blob,
  options: WhisperTranscribeOptions = {}
): Promise<string> {
  const url = options.url || "http://127.0.0.1:8085";
  const timeoutMs = options.timeoutMs ?? 5000;
  const language = options.language ?? "ru";

  const formData = new FormData();
  formData.append("file", audioBlob, "audio.webm");
  formData.append("language", language);
  formData.append("response_format", "json");
  formData.append("temperature", "0.0");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${url}/inference`, {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      clientLogger.error({
        event: "asr_http_error",
        provider: "whisper",
        statusCode: res.status,
        blobSize: audioBlob.size,
      });
      throw new Error(`Whisper server responded with HTTP ${res.status}`);
    }

    const data = (await res.json()) as { text?: string };
    return (data.text || "").trim();
  } catch (err) {
    clearTimeout(timer);
    clientLogger.warn({
      event: "asr_inference_failed",
      provider: "whisper",
      errorType: err instanceof Error ? err.name : "unknown",
    });
    throw err;
  }
}
