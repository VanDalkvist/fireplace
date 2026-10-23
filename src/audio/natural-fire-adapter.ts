import type { SoundEffectsPort } from "./sound-effects-port";

interface Voice { context: BaseAudioContext; gain: GainNode; filter: BiquadFilterNode; stopping: boolean }

export class NaturalFireAdapter implements SoundEffectsPort {
  private buffers = new Map<string | undefined, Promise<AudioBuffer>>();
  private recording: string | undefined;
  private generation = 0;
  private lastStart = -Infinity;
  private lastCue = -1;
  private voices = new Map<AudioBufferSourceNode, Voice>();

  constructor(private readonly load: (context: BaseAudioContext, recording?: string) => Promise<AudioBuffer>, private readonly random = Math.random) {}

  private buffer(context: BaseAudioContext): Promise<AudioBuffer> {
    const id = this.recording;
    let cached = this.buffers.get(id);
    if (!cached) {
      const pending = this.load(context, id).catch(error => {
        if (this.buffers.get(id) === pending) this.buffers.delete(id);
        throw error;
      });
      this.buffers.set(id, pending); cached = pending;
    }
    return cached;
  }

  selectRecording(id: string): void {
    this.stop(); this.recording = id; this.lastCue = -1;
  }

  async prepare(context: BaseAudioContext): Promise<void> { await this.buffer(context); }

  async play(context: BaseAudioContext, output: AudioNode): Promise<void> {
    const generation = this.generation;
    const buffer = await this.buffer(context);
    if (generation !== this.generation || [...this.voices.values()].filter(voice => !voice.stopping).length >= 2 || context.currentTime - this.lastStart < 0.75) return;
    if (context.state === "closed") throw new Error("Audio context is closed");
    const cue = this.lastCue < 0 ? Math.floor(this.random() * 3) : (this.lastCue + 1 + Math.floor(this.random() * 2)) % 3;
    const offset = Math.min(cue * 0.3, Math.max(0, buffer.duration - 1));
    this.createVoice(context, output, buffer, offset);
    this.lastCue = cue;
    this.lastStart = context.currentTime;
  }

  private createVoice(context: BaseAudioContext, output: AudioNode, buffer: AudioBuffer, offset: number): void {
    const source = context.createBufferSource(), gain = context.createGain(), filter = context.createBiquadFilter();
    const rate = 0.98 + this.random() * 0.04;
    const duration = Math.min(2.85, buffer.duration) - offset, length = duration / rate, t = context.currentTime + 0.01;
    source.buffer = buffer; source.loop = false; source.playbackRate.value = rate;
    filter.type = "highpass"; filter.frequency.value = 100;
    source.connect(filter); filter.connect(gain); gain.connect(output);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.35, t + Math.min(0.6, length * 0.3));
    gain.gain.linearRampToValueAtTime(0.1, t + length * 0.75);
    gain.gain.linearRampToValueAtTime(0, t + length);
    this.voices.set(source, { context, gain, filter, stopping: false });
    source.onended = () => this.release(source);
    try {
      source.start(t, offset, duration);
      source.stop(t + length + 0.02);
    } catch (cause) {
      this.release(source);
      throw new Error("Natural fire playback could not start", { cause });
    }
  }

  private release(source: AudioBufferSourceNode): void {
    const voice = this.voices.get(source);
    if (!voice) return;
    this.voices.delete(source); source.onended = null;
    source.disconnect(); voice.filter.disconnect(); voice.gain.disconnect();
  }

  stop(): void {
    this.generation++; this.lastStart = -Infinity;
    for (const [source, voice] of this.voices) {
      if (voice.stopping) continue;
      voice.stopping = true;
      const { context, gain } = voice;
      gain.gain.cancelScheduledValues(context.currentTime);
      gain.gain.setTargetAtTime(0, context.currentTime, 0.008);
      source.stop(context.currentTime + 0.04);
    }
  }
}
