import { MeetingAudioCapture } from "./meeting-audio-capture";
import { AudioStreamMixer } from "./audio-mixer";
import type { SoundEffectsPort } from "./sound-effects-port";
export { FAMILY_SEMITONES, BELL_STEPS, semitoneToHz } from "./audio-constants";

export class SalonAudioEngine {
  private ac: AudioContext | null = null;
  private master: GainNode | null = null;
  private duck: GainNode | null = null;
  private voiceBus: GainNode | null = null;
  private isEnabled = false;
  private volume = 0.6;
  private generation = 0;
  private playbackGeneration = 0;
  private meeting = new MeetingAudioCapture();
  private mixer = new AudioStreamMixer();

  constructor(private readonly effects: SoundEffectsPort, private readonly onError?: (error: unknown) => void) {}

  private init(): void {
    if (this.ac) return;
    const AudioContextClass = window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ac = new AudioContextClass();
    const comp = this.ac.createDynamicsCompressor();
    comp.threshold.value = -20; comp.knee.value = 12; comp.ratio.value = 3;
    comp.attack.value = 0.02; comp.release.value = 0.5;
    this.master = this.ac.createGain(); this.master.gain.value = 0;
    this.master.connect(comp); comp.connect(this.ac.destination);
    this.duck = this.ac.createGain(); this.voiceBus = this.ac.createGain();
    this.voiceBus.connect(this.duck); this.duck.connect(this.master);
  }

  private ramp(param: AudioParam, value: number, tau: number, at?: number): void {
    if (!this.ac) return;
    const t = at ?? this.ac.currentTime;
    param.cancelScheduledValues(t); param.setTargetAtTime(value, t, tau);
  }

  public toggle(): boolean {
    this.init();
    if (!this.ac || !this.master) return false;
    const generation = ++this.generation;
    this.playbackGeneration++;
    this.isEnabled = !this.isEnabled;
    if (!this.isEnabled) {
      this.effects.stop(); this.ramp(this.master.gain, 0, 0.4);
      return false;
    }
    this.ramp(this.master.gain, this.volume * 0.8, 0.6);
    void this.activate(this.ac, generation).catch(error => this.fail(error, generation));
    return true;
  }

  private async activate(context: AudioContext, generation: number): Promise<void> {
    if (context.state === "suspended") await context.resume();
    if (this.isEnabled && generation === this.generation) await this.effects.prepare(context);
  }

  private fail(error: unknown, generation: number): void {
    if (!this.isEnabled || generation !== this.generation) return;
    this.isEnabled = false; this.generation++; this.playbackGeneration++;
    this.effects.stop();
    if (this.master) this.ramp(this.master.gain, 0, 0.04);
    console.warn("[SalonAudioEngine] Natural fire audio failed:", error instanceof Error ? error.name : "unknown");
    this.onError?.(error);
  }

  private playSound(): void {
    const context = this.ac, output = this.voiceBus;
    if (!this.isEnabled || !context || !output) return;
    const generation = this.generation, playback = this.playbackGeneration;
    const current = () => this.isEnabled && generation === this.generation && playback === this.playbackGeneration;
    const resumed = context.state === "suspended" ? context.resume() : Promise.resolve();
    void resumed.then(() => {
      if (current()) return this.effects.play(context, output);
    }).catch(error => { if (current()) this.fail(error, generation); });
  }

  public playFeeling(_family: string, _valence = 0, _arousal = 0.4, _count = 1, _intensity = 1): void { this.playSound(); }
  public playDesire(_index = 0): void { this.playSound(); }

  public playPass(): void {
    if (!this.isEnabled || !this.ac || !this.duck) return;
    this.playbackGeneration++; this.effects.stop();
    const t = this.ac.currentTime;
    this.ramp(this.duck.gain, 0.12, 0.2, t);
    this.duck.gain.setTargetAtTime(1, t + 2.4, 0.9);
  }

  public setVolume(val: number): void {
    this.volume = Math.max(0, Math.min(1, val));
    if (this.master && this.isEnabled) this.ramp(this.master.gain, this.volume * 0.8, 0.2);
  }

  public get active(): boolean { return this.isEnabled; }

  public async captureMeetingAudio(): Promise<boolean> {
    this.init();
    if (this.ac && this.ac.state === "suspended") await this.ac.resume();
    return this.meeting.capture(this.ac);
  }

  public onMeetingAudioEnded(cb: () => void): void {
    this.meeting.onEnded(cb);
  }

  public disconnectMeetingAudio(): void {
    this.meeting.disconnect();
    this.mixer.cleanup();
  }

  public mixWithMicrophone(micStream: MediaStream, meetingStream: MediaStream): MediaStream {
    this.init();
    return this.mixer.mix(micStream, meetingStream, this.ac);
  }

  public cleanupMixer(): void {
    this.mixer.cleanup();
  }

  public get isMeetingAudioConnected(): boolean {
    return this.meeting.isConnected;
  }

  public getMeetingStream(): MediaStream | null {
    return this.meeting.getStream();
  }

  public getMeetingRmsLevel(): number {
    return this.meeting.getRmsLevel();
  }
}
