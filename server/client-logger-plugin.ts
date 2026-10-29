/**
 * Vite plugin for /api/client-log endpoint.
 * Connects validated client-logger handler to Vite development server (AP-010, AP-019, AP-021).
 */

import type { Plugin } from "vite";
import { createClientLoggerHandler } from "./client-logger-handler.ts";

export function clientLoggerPlugin(): Plugin {
  const handler = createClientLoggerHandler();
  return {
    name: "client-logger-middleware",
    configureServer(server) {
      server.middlewares.use("/api/client-log", handler);
    },
  };
}
