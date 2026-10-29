/**
 * Technical Log DTO & Validator: defines allowlisted diagnostic events and fields.
 * Prevents recognized speech, user text, error stacks, URLs, or arbitrary bodies
 * from entering diagnostic pipelines (AP-017, AP-024, AP-026, AP-029).
 */

export type LogLevel = "info" | "warn" | "error";

export const ALLOWED_LOG_LEVELS = new Set<LogLevel>(["info", "warn", "error"]);

export const ALLOWED_EVENT_NAMES = [
  "meeting_audio_no_tracks",
  "meeting_audio_captured",
  "meeting_audio_capture_failed",
  "asr_segment_skipped",
  "asr_segment_processing",
  "asr_phrase_recognized",
  "asr_phrase_empty",
  "asr_segment_failed",
  "asr_http_error",
  "asr_inference_failed",
  "asr_fallback_triggered",
  "asr_fallback_exhausted",
] as const;

export type TechnicalEventName = (typeof ALLOWED_EVENT_NAMES)[number];

const ALLOWED_EVENT_SET = new Set<string>(ALLOWED_EVENT_NAMES);

export const ALLOWED_PROVIDERS = new Set([
  "whisper",
  "openai",
  "fallback",
  "gigaam",
  "sherpa",
  "browser",
  "mock",
  "unknown",
]);

export const ALLOWED_ERROR_TYPES = new Set([
  "Error",
  "TypeError",
  "RangeError",
  "SyntaxError",
  "AbortError",
  "NotAllowedError",
  "NotFoundError",
  "NotReadableError",
  "OverconstrainedError",
  "SecurityError",
  "NetworkError",
  "TimeoutError",
  "DOMException",
  "unknown",
]);

export const ALLOWED_MIME_TYPES = new Set([
  "audio/webm",
  "audio/wav",
  "audio/ogg",
  "audio/mp4",
  "audio/mpeg",
  "unknown",
]);

export interface TechnicalLogRecord {
  level: LogLevel;
  event: TechnicalEventName;
  details?: Record<string, string | number | boolean>;
  timestamp: string;
}

export function sanitizeErrorType(raw: unknown): string {
  if (typeof raw !== "string" && !(raw instanceof Error)) return "unknown";
  const name = raw instanceof Error ? raw.name : raw;
  return ALLOWED_ERROR_TYPES.has(name) ? name : "unknown";
}

export function sanitizeProvider(raw: unknown): string {
  if (typeof raw !== "string") return "unknown";
  const lower = raw.toLowerCase();
  if (lower.includes("whisper")) return "whisper";
  if (lower.includes("gigaam")) return "gigaam";
  if (lower.includes("openai")) return "openai";
  if (lower.includes("fallback")) return "fallback";
  if (lower.includes("sherpa")) return "sherpa";
  if (lower.includes("browser")) return "browser";
  if (lower.includes("mock")) return "mock";
  return ALLOWED_PROVIDERS.has(lower) ? lower : "unknown";
}

export function sanitizeMimeType(raw: unknown): string {
  if (typeof raw !== "string") return "unknown";
  const clean = raw.split(";")[0].trim().toLowerCase();
  return ALLOWED_MIME_TYPES.has(clean) ? clean : "unknown";
}

function sanitizeNumber(val: unknown, min: number, max: number): number | undefined {
  if (typeof val !== "number" || !Number.isFinite(val)) return undefined;
  const intVal = Math.floor(val);
  return intVal >= min && intVal <= max ? intVal : undefined;
}

function isValidIsoDate(raw: unknown): boolean {
  if (typeof raw !== "string") return false;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z?$/.test(raw)) return false;
  const time = Date.parse(raw);
  return !Number.isNaN(time);
}

export function validateTechnicalLogPayload(raw: unknown): TechnicalLogRecord | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const data = raw as Record<string, unknown>;

  const level = typeof data.level === "string" ? (data.level.toLowerCase() as LogLevel) : null;
  if (!level || !ALLOWED_LOG_LEVELS.has(level)) return null;

  const event = typeof data.event === "string" ? data.event : null;
  if (!event || !ALLOWED_EVENT_SET.has(event)) return null;

  const timestamp = isValidIsoDate(data.timestamp)
    ? (data.timestamp as string)
    : new Date().toISOString();

  const detailsObj = (data.details && typeof data.details === "object" && !Array.isArray(data.details))
    ? (data.details as Record<string, unknown>)
    : data;

  const validatedDetails: Record<string, string | number | boolean> = {};

  switch (event as TechnicalEventName) {
    case "meeting_audio_no_tracks":
      break;

    case "meeting_audio_captured": {
      const trackCount = sanitizeNumber(detailsObj.trackCount, 0, 32);
      if (trackCount === undefined) return null;
      validatedDetails.trackCount = trackCount;
      break;
    }

    case "meeting_audio_capture_failed": {
      validatedDetails.errorType = sanitizeErrorType(detailsObj.errorType);
      break;
    }

    case "asr_segment_skipped": {
      validatedDetails.provider = sanitizeProvider(detailsObj.provider);
      const reason = detailsObj.reason;
      validatedDetails.reason = (reason === "silence" || reason === "quiet" || reason === "empty") ? reason : "silence";
      const bufferSize = sanitizeNumber(detailsObj.bufferSize, 0, 10_000_000);
      if (bufferSize !== undefined) validatedDetails.bufferSize = bufferSize;
      break;
    }

    case "asr_segment_processing": {
      validatedDetails.provider = sanitizeProvider(detailsObj.provider);
      const blobSize = sanitizeNumber(detailsObj.blobSize, 0, 100_000_000);
      if (blobSize === undefined) return null;
      validatedDetails.blobSize = blobSize;
      validatedDetails.mimeType = sanitizeMimeType(detailsObj.mimeType);
      break;
    }

    case "asr_phrase_recognized": {
      validatedDetails.provider = sanitizeProvider(detailsObj.provider);
      const charCount = sanitizeNumber(detailsObj.charCount, 0, 100_000);
      if (charCount === undefined) return null;
      validatedDetails.charCount = charCount;
      const seatNumber = sanitizeNumber(detailsObj.seatNumber, 0, 32);
      if (seatNumber !== undefined) validatedDetails.seatNumber = seatNumber;
      break;
    }

    case "asr_phrase_empty": {
      validatedDetails.provider = sanitizeProvider(detailsObj.provider);
      break;
    }

    case "asr_segment_failed": {
      validatedDetails.provider = sanitizeProvider(detailsObj.provider);
      const attempt = sanitizeNumber(detailsObj.attempt, 1, 10) ?? 1;
      validatedDetails.attempt = attempt;
      validatedDetails.errorType = sanitizeErrorType(detailsObj.errorType);
      break;
    }

    case "asr_http_error": {
      validatedDetails.provider = sanitizeProvider(detailsObj.provider);
      const statusCode = sanitizeNumber(detailsObj.statusCode, 100, 599);
      if (statusCode === undefined) return null;
      validatedDetails.statusCode = statusCode;
      const blobSize = sanitizeNumber(detailsObj.blobSize, 0, 100_000_000);
      if (blobSize !== undefined) validatedDetails.blobSize = blobSize;
      break;
    }

    case "asr_inference_failed": {
      validatedDetails.provider = sanitizeProvider(detailsObj.provider);
      validatedDetails.errorType = sanitizeErrorType(detailsObj.errorType);
      break;
    }

    case "asr_fallback_triggered": {
      validatedDetails.primaryProvider = sanitizeProvider(detailsObj.primaryProvider);
      validatedDetails.fallbackProvider = sanitizeProvider(detailsObj.fallbackProvider);
      validatedDetails.errorType = sanitizeErrorType(detailsObj.errorType);
      break;
    }

    case "asr_fallback_exhausted": {
      validatedDetails.fallbackProvider = sanitizeProvider(detailsObj.fallbackProvider);
      validatedDetails.errorType = sanitizeErrorType(detailsObj.errorType);
      break;
    }

    default:
      return null;
  }

  return {
    level,
    event: event as TechnicalEventName,
    details: Object.keys(validatedDetails).length > 0 ? validatedDetails : undefined,
    timestamp,
  };
}
