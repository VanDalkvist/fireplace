export interface SoundEffectsPort {
  selectRecording(id: string): void;
  prepare(context: BaseAudioContext): Promise<void>;
  play(context: BaseAudioContext, output: AudioNode): Promise<void>;
  stop(): void;
}
