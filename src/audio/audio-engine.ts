import { FAMILY_SEMITONES, BELL_STEPS, semitoneToHz } from "./audio-constants";
import { MeetingAudioCapture } from "./meeting-audio-capture";

export { FAMILY_SEMITONES, BELL_STEPS, semitoneToHz };

export class SalonAudioEngine {
  private ac: AudioContext | null = null;
  private master: GainNode | null = null;
  private duck: GainNode | null = null;
  private voiceBus: GainNode | null = null;
  private droneBus: GainNode | null = null;
  private isEnabled: boolean = false;
  private volume: number = 0.6;
  private meeting = new MeetingAudioCapture();

  private init(): void {
    if (this.ac) return;
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ac = new AudioContextClass();

    const comp = this.ac.createDynamicsCompressor();
    comp.threshold.value = -20;
    comp.knee.value = 12;
    comp.ratio.value = 3;
    comp.attack.value = 0.02;
    comp.release.value = 0.5;

    this.master = this.ac.createGain();
    this.master.gain.value = 0;
    this.master.connect(comp);
    comp.connect(this.ac.destination);

    this.duck = this.ac.createGain();
    this.voiceBus = this.ac.createGain();
    this.droneBus = this.ac.createGain();

    this.voiceBus.connect(this.duck);
    this.droneBus.connect(this.duck);
    this.duck.connect(this.master);
  }

  private ramp(param: AudioParam, value: number, tau: number, at?: number): void {
    if (!this.ac) return;
    const t = at ?? this.ac.currentTime;
    param.cancelScheduledValues(t);
    param.setTargetAtTime(value, t, tau);
  }

  public toggle(): boolean {
    this.init();
    if (!this.ac || !this.master) return false;

    if (this.isEnabled) {
      this.isEnabled = false;
      this.ramp(this.master.gain, 0, 0.4);
      return false;
    }

    if (this.ac.state === "suspended") {
      this.ac.resume();
    }
    this.isEnabled = true;
    this.ramp(this.master.gain, this.volume * 0.8, 0.6);
    return true;
  }

  public playFeeling(
    family: string,
    valence: number = 0,
    arousal: number = 0.4,
    count: number = 1,
    intensity: number = 1
  ): void {
    if (!this.isEnabled || !this.ac || !this.voiceBus) return;
    const t = this.ac.currentTime + 0.02;
    const semi = FAMILY_SEMITONES[family] ?? 0;
    const f = semitoneToHz(semi) * (arousal > 0.65 ? 2 : 1);
    const iv = valence > 0.15 ? 4 : valence < -0.15 ? 3 : 7;
    const att = 0.03 + (1 - arousal) * 0.7;
    const cutoff = 700 + arousal * 2400;
    const gain = 0.06 * Math.min(1.4, intensity) * (1 + 0.2 * Math.log2(count));

    this.playTone(f, t, att, 4.2, gain, cutoff);
    this.playTone(f * Math.pow(2, iv / 12), t + 0.1, att, 4, gain * 0.7, cutoff);
  }

  private playTone(f: number, t: number, att: number, dur: number, gain: number, cutoff: number): void {
    if (!this.ac || !this.voiceBus) return;
    const g = this.ac.createGain();
    const lp = this.ac.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = cutoff;

    const o1 = this.ac.createOscillator();
    const o2 = this.ac.createOscillator();
    const o2g = this.ac.createGain();

    o1.type = "triangle";
    o1.frequency.value = f;
    o2.type = "sine";
    o2.frequency.value = f * 2;
    o2g.gain.value = 0.22;

    o1.connect(lp);
    o2.connect(o2g);
    o2g.connect(lp);
    lp.connect(g);
    g.connect(this.voiceBus);

    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + att);
    g.gain.setTargetAtTime(0, t + att, dur / 4);

    const end = t + att + dur + 1.5;
    o1.start(t);
    o2.start(t);
    o1.stop(end);
    o2.stop(end);

    // Guaranteed Web Audio cleanup (AP-012, AP-023)
    o1.onended = () => {
      try {
        o1.disconnect(); o2.disconnect(); o2g.disconnect(); lp.disconnect(); g.disconnect();
      } catch (err) {
        console.warn("[SalonAudioEngine] playTone cleanup error:", err);
      }
    };
  }

  public playDesire(index: number = 0): void {
    if (!this.isEnabled || !this.ac || !this.voiceBus) return;
    const t = this.ac.currentTime + 0.02;
    const step = BELL_STEPS[index % BELL_STEPS.length] + 12;
    const f = semitoneToHz(step);

    const car = this.ac.createOscillator();
    const mod = this.ac.createOscillator();
    const mg = this.ac.createGain();
    const g = this.ac.createGain();

    car.frequency.value = f;
    mod.frequency.value = f * 1.4;
    mg.gain.setValueAtTime(f * 1.8, t);
    mg.gain.exponentialRampToValueAtTime(1, t + 2.6);

    mod.connect(mg);
    mg.connect(car.frequency);
    car.connect(g);
    g.connect(this.voiceBus);

    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.06, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 5.5);

    car.start(t);
    mod.start(t);
    car.stop(t + 5.7);
    mod.stop(t + 5.7);

    car.onended = () => {
      try {
        mod.disconnect(); mg.disconnect(); car.disconnect(); g.disconnect();
      } catch (err) {
        console.warn("[SalonAudioEngine] playDesire cleanup error:", err);
      }
    };
  }

  public playPass(): void {
    if (!this.isEnabled || !this.ac || !this.duck) return;
    const t = this.ac.currentTime;
    this.ramp(this.duck.gain, 0.12, 0.2, t);
    this.duck.gain.setTargetAtTime(1, t + 2.4, 0.9);
  }

  public setVolume(val: number): void {
    this.volume = Math.max(0, Math.min(1, val));
    if (this.master && this.isEnabled) {
      this.ramp(this.master.gain, this.volume * 0.8, 0.2);
    }
  }

  public get active(): boolean {
    return this.isEnabled;
  }

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
