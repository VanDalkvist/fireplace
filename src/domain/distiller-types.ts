export interface LlmCompletionRequest {
  prompt: string;
  systemPrompt?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  jsonFormat?: boolean;
}

export interface LlmCompletionResponse {
  content: string;
  modelUsed: string;
}

export interface LlmDistillerPort {
  readonly id: string;
  readonly name: string;
  complete(req: LlmCompletionRequest, timeoutMs?: number): Promise<LlmCompletionResponse | null>;
  checkHealth(): Promise<{ online: boolean; model: string }>;
}
