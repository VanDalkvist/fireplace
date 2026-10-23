import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";
import { createPiRuntime, type PiCompletionRequest, type PiRuntimePort } from "./pi-runtime.ts";

class PiRequestError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}

async function parseRequest(req: IncomingMessage): Promise<PiCompletionRequest> {
  let body = "";
  for await (const chunk of req) {
    body += chunk.toString();
    if (Buffer.byteLength(body) > 65536) throw new PiRequestError(413, "Request too large");
  }
  let value: unknown;
  try { value = JSON.parse(body); }
  catch (cause) { throw new PiRequestError(400, cause instanceof SyntaxError ? "Invalid JSON" : "Invalid request"); }
  if (!value || typeof value !== "object") throw new PiRequestError(400, "Invalid request");
  const data = value as Record<string, unknown>;
  if (typeof data.prompt !== "string" || !data.prompt.trim() || data.prompt.length > 32000 ||
      (data.systemPrompt !== undefined && (typeof data.systemPrompt !== "string" || data.systemPrompt.length > 16000)) ||
      (data.model !== undefined && (typeof data.model !== "string" || !/^gpt-[a-z0-9.-]+$/.test(data.model))) ||
      (data.maxTokens !== undefined && (!Number.isInteger(data.maxTokens) || Number(data.maxTokens) < 1 || Number(data.maxTokens) > 2048))) {
    throw new PiRequestError(400, "Invalid completion fields");
  }
  return { prompt: data.prompt, systemPrompt: data.systemPrompt as string | undefined, model: typeof data.model === "string" ? data.model : "gpt-6-luna", maxTokens: typeof data.maxTokens === "number" ? data.maxTokens : 1000 };
}

export function createPiHandler(runtime: PiRuntimePort) {
  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    const controller = new AbortController();
    const cancel = () => controller.abort();
    const timer = setTimeout(cancel, 15000);
    res.on("close", cancel);
    const send = (status: number, payload: unknown) => { if (!res.destroyed) { res.statusCode = status; res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(payload)); } };
    try {
      if (req.headers.origin && new URL(req.headers.origin).host !== req.headers.host) throw new PiRequestError(403, "Origin not allowed");
      if (req.url === "/health" && req.method === "GET") { send(200, await runtime.health()); return; }
      if (req.url !== "/complete") throw new PiRequestError(404, "Not found");
      if (req.method !== "POST") throw new PiRequestError(405, "POST required");
      const request = await parseRequest(req);
      send(200, await runtime.complete(request, controller.signal));
    } catch (cause) {
      const status = cause instanceof PiRequestError ? cause.status : 503;
      console.warn("[PiCompletion]", { event: "completion_failed", outcome: "failed", status });
      send(status, { error: { code: status === 503 ? "pi_unavailable" : "invalid_request", message: cause instanceof PiRequestError ? cause.message : "Pi/Codex completion unavailable" } });
    } finally { clearTimeout(timer); res.off("close", cancel); }
  };
}

export function piDistillerPlugin(): Plugin {
  const runtime = createPiRuntime();
  return { name: "pi-distiller", configureServer(server) { server.middlewares.use("/api/pi", createPiHandler(runtime)); } };
}
