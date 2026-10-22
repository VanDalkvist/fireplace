/**
 * Client Logger: Dispatches client-side logs to Vite dev server / PM2 output.
 * Ensures browser errors (VAD, Whisper, Sherpa) are visible in PM2 stdout/stderr.
 * Compliance: AP-019 (<= 250 lines), AP-022 (explicit error logging), AP-029 (strict TS)
 */

export type LogLevel = "info" | "warn" | "error";

export interface LogPayload {
  level: LogLevel;
  message: string;
  details?: Record<string, unknown> | string;
  timestamp: string;
}

class ClientLogger {
  private endpoint = "/api/client-log";

  public log(level: LogLevel, message: string, details?: unknown): void {
    // 1. Local browser console
    const formattedDetails = details instanceof Error
      ? { name: details.name, message: details.message, stack: details.stack }
      : (details as Record<string, unknown> | undefined);

    if (level === "error") {
      console.error(`[ClientLogger] ${message}`, formattedDetails || "");
    } else if (level === "warn") {
      console.warn(`[ClientLogger] ${message}`, formattedDetails || "");
    } else {
      console.log(`[ClientLogger] ${message}`, formattedDetails || "");
    }

    // 2. Dispatch to Vite server middleware (PM2 captures stdout/stderr)
    const payload: LogPayload = {
      level,
      message,
      details: formattedDetails,
      timestamp: new Date().toISOString(),
    };

    this.send(payload);
  }

  public info(message: string, details?: unknown): void {
    this.log("info", message, details);
  }

  public warn(message: string, details?: unknown): void {
    this.log("warn", message, details);
  }

  public error(message: string, details?: unknown): void {
    this.log("error", message, details);
  }

  private send(payload: LogPayload): void {
    const json = JSON.stringify(payload);

    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      try {
        const blob = new Blob([json], { type: "application/json" });
        if (navigator.sendBeacon(this.endpoint, blob)) return;
      } catch {
        // Fallback to fetch
      }
    }

    if (typeof fetch !== "undefined") {
      fetch(this.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: json,
        keepalive: true,
      }).catch(() => {
        // Suppress network errors from logger itself to prevent infinite loops (AP-022)
      });
    }
  }
}

export const clientLogger = new ClientLogger();
