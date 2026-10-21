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
  } catch {
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
      throw new Error(`Whisper server responded with HTTP ${res.status}`);
    }

    const data = (await res.json()) as { text?: string };
    return (data.text || "").trim();
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}
