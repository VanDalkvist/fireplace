export interface SoundEffectsPort {
  prepare(context: BaseAudioContext): Promise<void>;
  play(context: BaseAudioContext, output: AudioNode): Promise<void>;
  stop(): void;
}
