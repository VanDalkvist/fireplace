import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";

function openrouterProxyPlugin(): Plugin {
  return {
    name: "openrouter-proxy-middleware",
    configureServer(server) {
      server.middlewares.use("/api/openrouter", (req: IncomingMessage, res: ServerResponse) => {
        if (req.method === "POST") {
          let body = "";
          req.on("data", (chunk: Buffer) => {
            body += chunk.toString();
          });
          req.on("end", async () => {
            try {
              const apiKey = process.env.OPENROUTER_API_KEY || "";
              const subpath = req.url || "";
              const targetUrl = `https://openrouter.ai/api/v1${subpath.startsWith("/") ? subpath : `/${subpath}`}`;

              const upstream = await fetch(targetUrl, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${apiKey}`,
                  "HTTP-Referer": "http://127.0.0.1:4343",
                  "X-Title": "Salon Presence",
                },
                body,
              });

              const respText = await upstream.text();
              res.statusCode = upstream.status;
              res.setHeader("Content-Type", "application/json");
              res.end(respText);
            } catch (err) {
              console.error("[openrouterProxyPlugin] Proxy error:", err);
              res.statusCode = 502;
              res.end(JSON.stringify({ error: { message: "OpenRouter proxy error" } }));
            }
          });
        } else {
          res.statusCode = 405;
          res.end("Method Not Allowed");
        }
      });
    },
  };
}

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

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(import.meta.dirname, ".."), "");
  process.env.OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || env.OPENROUTER_API_KEY;

  return {
    plugins: [react(), tailwindcss(), clientLoggerPlugin(), openrouterProxyPlugin()],
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "./src"),
      },
    },
    server: {
      port: 4343,
    },
  };
});
