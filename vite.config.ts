import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";

function clientLoggerPlugin(): Plugin {
  return {
    name: "client-logger-middleware",
    configureServer(server) {
      server.middlewares.use("/api/client-log", (req: IncomingMessage, res: ServerResponse) => {
        if (req.method === "POST") {
          let body = "";
          req.on("data", (chunk: Buffer) => {
            body += chunk.toString();
          });
          req.on("end", () => {
            try {
              const { level, message, details, timestamp } = JSON.parse(body);
              const detailStr = details ? ` | ${typeof details === "string" ? details : JSON.stringify(details)}` : "";
              const logLine = `[Client ${level?.toUpperCase() || "INFO"}] [${timestamp || new Date().toISOString()}] ${message}${detailStr}`;

              if (level === "error") {
                console.error(logLine);
              } else if (level === "warn") {
                console.warn(logLine);
              } else {
                console.log(logLine);
              }
            } catch (err) {
              console.warn("[clientLoggerPlugin] Malformed log payload:", err);
            }
            res.statusCode = 204;
            res.end();
          });
        } else {
          res.statusCode = 405;
          res.end("Method Not Allowed");
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), clientLoggerPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  server: {
    port: 4343,
  },
});
