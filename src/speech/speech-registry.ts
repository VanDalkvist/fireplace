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
    const active = this.activeId ? this.providers.get(this.activeId) : undefined;
    if (!active) throw new Error("Active ASR provider is not registered in SpeechServiceRegistry");
    return active;
  }

  public setActive(id: string): void {
    if (!this.providers.has(id)) {
      throw new Error(`Provider '${id}' is not registered in SpeechServiceRegistry`);
    }
    this.activeId = id;
  }
}
