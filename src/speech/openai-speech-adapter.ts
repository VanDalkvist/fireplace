import type { SpeechToTextPort } from "./speech-types";
import { transcribeAudioBlobOpenAi } from "./openai-speech-client";

export interface OpenAiSpeechAdapterConfig {
  id: string;
  name: string;
  baseUrl: string;
  model?: string;
  language?: string;
  isLocal?: boolean;
  transcriptionPath?: "/v1/audio/transcriptions" | "/inference";
}

export class OpenAiSpeechAdapter implements SpeechToTextPort {
  public readonly id: string;
  public readonly name: string;
  public readonly baseUrl: string;
  public readonly isLocal: boolean;
  private model: string;
  private language: string;
  public readonly transcriptionPath: "/v1/audio/transcriptions" | "/inference";

  constructor(config: OpenAiSpeechAdapterConfig) {
    this.id = config.id;
    this.name = config.name;
    this.baseUrl = config.baseUrl;
    this.model = config.model ?? "whisper-1";
    this.language = config.language ?? "ru";
    this.transcriptionPath = config.transcriptionPath ?? "/v1/audio/transcriptions";
    this.isLocal = config.isLocal ?? true;
  }

  public async transcribe(audioBlob: Blob): Promise<string> {
    return transcribeAudioBlobOpenAi(audioBlob, {
      baseUrl: this.baseUrl,
      model: this.model,
      language: this.language,
      transcriptionPath: this.transcriptionPath,
    });
  }
}
