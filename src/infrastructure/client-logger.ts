/**
 * Client Logger: Dispatches allowlisted technical events to local console & Vite server.
 * Guarantees privacy: drops free-form messages/details, ensuring recognized speech,
 * arbitrary errors or remote response bodies never leak (AP-017, AP-019, AP-022, AP-024).
 */

import {
  type LogLevel,
  type TechnicalEventName,
  type TechnicalLogRecord,
  validateTechnicalLogPayload,
} from "./technical-log-dto.ts";

export type ClientLogInput =
  | { event: TechnicalEventName; [key: string]: unknown }
  | TechnicalLogRecord;

class ClientLogger {
  private endpoint = "/api/client-log";

  public log(level: LogLevel, input: ClientLogInput): void {
    const raw = typeof input === "object" && input !== null
      ? { ...input, level, timestamp: new Date().toISOString() }
      : null;

    const validated = validateTechnicalLogPayload(raw);
    if (!validated) {
      // Drop unallowlisted or malformed diagnostic data without reflecting contents (AP-024)
      return;
    }

    // 1. Local browser console with allowlisted metadata only
    const logTag = `[ClientLogger] [${validated.level.toUpperCase()}] [${validated.event}]`;
    const detailsOutput = validated.details ? JSON.stringify(validated.details) : "";

    if (validated.level === "error") {
      console.error(logTag, detailsOutput);
    } else if (validated.level === "warn") {
      console.warn(logTag, detailsOutput);
    } else {
      console.log(logTag, detailsOutput);
    }

    // 2. Dispatch allowlisted record to Vite dev server / PM2
    this.send(validated);
  }

  public info(input: ClientLogInput): void {
    this.log("info", input);
  }

  public warn(input: ClientLogInput): void {
    this.log("warn", input);
  }

  public error(input: ClientLogInput): void {
    this.log("error", input);
  }

  private send(record: TechnicalLogRecord): void {
    const json = JSON.stringify(record);

    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      try {
        const blob = new Blob([json], { type: "application/json" });
        if (navigator.sendBeacon(this.endpoint, blob)) return;
      } catch {
        // Fall through to fetch without recursive logging
      }
    }

    if (typeof fetch !== "undefined") {
      fetch(this.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: json,
        keepalive: true,
      }).catch(() => {
        // Suppress network errors from logger to prevent infinite recursion (AP-022)
      });
    }
  }
}

export const clientLogger = new ClientLogger();
export type { LogLevel, TechnicalEventName, TechnicalLogRecord };
