import { describe, it, expect } from 'vitest';
import { createSpeechEngine, createDefaultSpeechRegistry } from '../src/speech/speech-factory';
import { WhisperSpeechAdapter } from '../src/speech/whisper-speech-adapter';
import { SalonSpeechEngine } from '../src/speech/speech-engine';

describe('Speech Factory & Composition Root', () => {
  it('creates default registry with GigaAM and Whisper Large Turbo', () => {
    const registry = createDefaultSpeechRegistry();
    const providers = registry.list();

    expect(providers.length).toBe(2);
    expect(registry.get('gigaam')?.name).toBe('Sber GigaAM v3');
    expect(registry.get('whisper')?.name).toBe('Whisper Large Turbo');
    expect(registry.getActive().id).toBe('gigaam');
  });

  it('creates GigaAM engine by default when requested', () => {
    const engine = createSpeechEngine('gigaam');
    expect(engine).toBeInstanceOf(WhisperSpeechAdapter);
    expect(engine.getEngineType()).toBe('gigaam');
  });

  it('creates Whisper engine when requested', () => {
    const engine = createSpeechEngine('whisper');
    expect(engine).toBeInstanceOf(WhisperSpeechAdapter);
    expect(engine.getEngineType()).toBe('whisper');
  });

  it('creates Browser Web Speech engine when google is requested', () => {
    const engine = createSpeechEngine('google');
    expect(engine).toBeInstanceOf(SalonSpeechEngine);
    expect(engine.getEngineType()).toBe('google');
  });
});
