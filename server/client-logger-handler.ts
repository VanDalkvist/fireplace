/**
 * Server Client-Logger Handler: endpoint for receiving diagnostic client logs.
 * Validates request size, origin, method and enforces strict technical-event allowlist.
 * Ensures untrusted or adversarial payloads are rejected without reflection (AP-016, AP-017, AP-019, AP-024).
 */

import type { IncomingMessage, ServerResponse } from "node:http";
import { validateTechnicalLogPayload } from "../src/infrastructure/technical-log-dto.ts";

const MAX_BODY_BYTES = 4096;

export function createClientLoggerHandler() {
  return (req: IncomingMessage, res: ServerResponse): void => {
    if (req.method !== "POST") {
      res.statusCode = 405;
      res.setHeader("Content-Type", "text/plain");
      res.end("Method Not Allowed");
      return;
    }

    // Origin validation: reject cross-origin submissions
    if (req.headers.origin) {
      try {
        const originHost = new URL(req.headers.origin).host;
        if (originHost !== req.headers.host) {
          res.statusCode = 403;
          res.setHeader("Content-Type", "text/plain");
          res.end("Forbidden");
          return;
        }
      } catch {
        res.statusCode = 403;
        res.setHeader("Content-Type", "text/plain");
        res.end("Forbidden");
        return;
      }
    }

    let body = "";
    let bodyBytes = 0;
    let tooLarge = false;

    req.on("data", (chunk: Buffer) => {
      bodyBytes += chunk.length;
      if (bodyBytes > MAX_BODY_BYTES) {
        tooLarge = true;
        res.statusCode = 413;
        res.setHeader("Content-Type", "text/plain");
        res.end("Payload Too Large");
        req.destroy();
        return;
      }
      body += chunk.toString();
    });

    req.on("end", () => {
      if (tooLarge || res.writableEnded) return;

      let parsed: unknown;
      try {
        parsed = JSON.parse(body);
      } catch {
        res.statusCode = 400;
        res.setHeader("Content-Type", "text/plain");
        res.end("Bad Request");
        return;
      }

      const validated = validateTechnicalLogPayload(parsed);
      if (!validated) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "text/plain");
        res.end("Bad Request");
        return;
      }

      const detailStr = validated.details ? ` | ${JSON.stringify(validated.details)}` : "";
      const logLine = `[Client ${validated.level.toUpperCase()}] [${validated.timestamp}] [${validated.event}]${detailStr}`;

      if (validated.level === "error") {
        console.error(logLine);
      } else if (validated.level === "warn") {
        console.warn(logLine);
      } else {
        console.log(logLine);
      }

      res.statusCode = 204;
      res.end();
    });
  };
}
