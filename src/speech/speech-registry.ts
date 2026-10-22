import type { SpeechToTextPort } from "./speech-types";

export class SpeechServiceRegistry {
  private providers = new Map<string, SpeechToTextPort>();
  private activeId: string | null = null;

  public register(provider: SpeechToTextPort): void {
    this.providers.set(provider.id, provider);
    if (!this.activeId) {
      this.activeId = provider.id;
    }
  }

  public get(id: string): SpeechToTextPort | undefined {
    return this.providers.get(id);
  }

  public list(): SpeechToTextPort[] {
    return Array.from(this.providers.values());
  }

  public getActive(): SpeechToTextPort {
    if (!this.activeId || !this.providers.has(this.activeId)) {
      const first = this.providers.values().next().value;
      if (!first) {
        throw new Error("No ASR providers registered in SpeechServiceRegistry");
      }
      return first;
    }
    return this.providers.get(this.activeId)!;
  }

  public setActive(id: string): void {
    if (!this.providers.has(id)) {
      throw new Error(`Provider '${id}' is not registered in SpeechServiceRegistry`);
    }
    this.activeId = id;
  }
}
