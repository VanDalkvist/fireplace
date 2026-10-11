/* звук практики «чувства» · Web Audio, без сэмплов, всё синтезируется в браузере.
   каждое слово – тон: семья → высота (лад ре дорийский), валентность → терция сверху (большая · малая · квинта),
   возбуждение → атака и яркость. облако держит медленный гул: у каждой семьи свой голос, повтор чувства его усиливает.
   желание – колокольный удар вверх. «пас» – тишина на такт. выход – последний аккорд и затухание.
   включается только по клику или клавише m. часть Алекса: менять смело, app.js зовёт только методы внизу. */
(function (root) {
'use strict';
const BASE = 146.83;                                   // ре малой октавы
// полутоны от ре: только ступени ре дорийского (ре ми фа соль ля си до), чтобы гул не скрежетал
const FAMILY = { радость: 7, живость: 14, интерес: 9, нежность: 5, спокойствие: 0, тело: -5, усталость: 2, грусть: 3,
  растерянность: 10, стыд: -2, страх: -3, тревога: -10, злость: -12, другое: 0 };
const BELL = [0, 2, 5, 7, 9, 12, 14];                  // пентатоника для фонариков
const hz = semi => BASE * Math.pow(2, semi / 12);

const M = { on: false, volume: 0.6 };
let ac = null, master, duck, voiceBus, droneBus, drones = {}, roomVoice = null, weightsNow = {};

function init() {
  ac = new (root.AudioContext || root.webkitAudioContext)();
  const comp = ac.createDynamicsCompressor();
  comp.threshold.value = -20; comp.knee.value = 12; comp.ratio.value = 3; comp.attack.value = 0.02; comp.release.value = 0.5;
  master = ac.createGain(); master.gain.value = 0;
  master.connect(comp); comp.connect(ac.destination);
  const conv = ac.createConvolver(); conv.buffer = impulse(3.8, 2.6);
  const wet = ac.createGain(), dry = ac.createGain(); wet.gain.value = 0.6; dry.gain.value = 0.7;
  duck = ac.createGain(); voiceBus = ac.createGain(); droneBus = ac.createGain();
  voiceBus.connect(duck); droneBus.connect(duck);
  duck.connect(dry); duck.connect(conv); conv.connect(wet); dry.connect(master); wet.connect(master);
}
// реверб: стерео-шум, смягчённый и затухающий
function impulse(sec, decay) {
  const len = Math.floor(ac.sampleRate * sec), b = ac.createBuffer(2, len, ac.sampleRate);
  for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); let lp = 0; for (let i = 0; i < len; i++) { lp += ((Math.random() * 2 - 1) - lp) * 0.3; d[i] = lp * Math.pow(1 - i / len, decay); } }
  return b;
}
const now = () => ac.currentTime;
const ramp = (p, v, tau, at) => { const t = at ?? now(); p.cancelScheduledValues(t); p.setTargetAtTime(v, t, tau); };

// голос гула: синус + треугольник на квинту, тёмный фильтр, медленное дыхание
function voice(f) {
  while (f < 68) f *= 2;
  const g = ac.createGain(); g.gain.value = 0;
  const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 560; lp.Q.value = 0.4;
  const o1 = ac.createOscillator(); o1.type = 'sine'; o1.frequency.value = f;
  const o2 = ac.createOscillator(); o2.type = 'triangle'; o2.frequency.value = f * 1.5; o2.detune.value = 3 + Math.random() * 4;
  const o2g = ac.createGain(); o2g.gain.value = 0.3;
  const breath = ac.createGain(); breath.gain.value = 0.75;
  const lfo = ac.createOscillator(); lfo.frequency.value = 0.04 + Math.random() * 0.06;
  const lfoG = ac.createGain(); lfoG.gain.value = 0.25;
  lfo.connect(lfoG); lfoG.connect(breath.gain);
  o1.connect(lp); o2.connect(o2g); o2g.connect(lp); lp.connect(breath); breath.connect(g); g.connect(droneBus);
  [o1, o2, lfo].forEach(o => o.start());
  return { g };
}
const drone = fam => drones[fam] || (drones[fam] = voice(hz(FAMILY[fam] ?? 0) / 2));

// тон слова: два осциллятора через фильтр, мягкая огибающая
function tone(f, t, att, dur, gain, cutoff) {
  const g = ac.createGain(), lp = ac.createBiquadFilter();
  lp.type = 'lowpass'; lp.frequency.value = cutoff; lp.Q.value = 0.5;
  const o1 = ac.createOscillator(), o2 = ac.createOscillator(), o2g = ac.createGain();
  o1.type = 'triangle'; o1.frequency.value = f; o2.type = 'sine'; o2.frequency.value = f * 2; o2g.gain.value = 0.22;
  o1.connect(lp); o2.connect(o2g); o2g.connect(lp); lp.connect(g); g.connect(voiceBus);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + att); g.gain.setTargetAtTime(0, t + att, dur / 4);
  const end = t + att + dur + 1.5; o1.start(t); o2.start(t); o1.stop(end); o2.stop(end);
}
// колокол: частотная модуляция с негармоническим отношением, удар мягкий
function bell(f, t, gain) {
  const car = ac.createOscillator(), mod = ac.createOscillator(), mg = ac.createGain(), g = ac.createGain(), lp = ac.createBiquadFilter();
  car.frequency.value = f; mod.frequency.value = f * 1.4;
  mg.gain.setValueAtTime(f * 1.8, t); mg.gain.exponentialRampToValueAtTime(1, t + 2.6);
  mod.connect(mg); mg.connect(car.frequency);
  lp.type = 'lowpass'; lp.frequency.value = 3600;
  car.connect(lp); lp.connect(g); g.connect(voiceBus);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + 5.5);
  car.start(t); mod.start(t); car.stop(t + 5.7); mod.stop(t + 5.7);
}

/* ---------- то, что зовёт app.js ---------- */
M.word = ({ family, valence = 0, arousal = 0.4, count = 1, intensity = 1 }) => {
  if (!M.on) return;
  const t = now() + 0.02, f = hz(FAMILY[family] ?? 0) * (arousal > 0.65 ? 2 : 1);
  const iv = valence > 0.15 ? 4 : valence < -0.15 ? 3 : 7;
  const att = 0.03 + (1 - arousal) * 0.7, cutoff = 700 + arousal * 2400;
  const gain = 0.06 * Math.min(1.4, intensity) * (1 + 0.2 * Math.log2(count));
  tone(f, t, att, 4.2, gain, cutoff);
  tone(f * Math.pow(2, iv / 12), t + 0.1 + (1 - arousal) * 0.25, att, 4, gain * 0.7, cutoff);
  if (count > 1) tone(f / 2, t, att * 1.5, 5, gain * 0.5, cutoff * 0.6);
};
M.desire = ({ index = 0 }) => {
  if (!M.on) return;
  const t = now() + 0.02, f = hz(BELL[index % BELL.length] + 12);
  bell(f / 1.5, t, 0.035);
  bell(f, t + 0.16, 0.06);
};
M.pass = () => {
  if (!M.on) return;
  const t = now(); ramp(duck.gain, 0.12, 0.2, t); duck.gain.setTargetAtTime(1, t + 2.4, 0.9);
};
M.cloud = weights => {
  weightsNow = weights || {};
  if (!M.on) return;
  const fams = new Set([...Object.keys(drones), ...Object.keys(weightsNow)]);
  for (const fam of fams) { const w = weightsNow[fam] || 0; ramp(drone(fam).g.gain, Math.min(0.06, 0.02 * Math.sqrt(w)), 2.5); }
};
M.exit = weights => {
  weightsNow = weights || weightsNow;
  if (!M.on) return;
  const t = now() + 3;                                   // облако сначала замирает, потом аккорд
  const top = Object.entries(weightsNow).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([f]) => FAMILY[f] ?? 0);
  [...new Set([0, 7, ...top])].forEach((s, k) => tone(hz(s) * (s < 0 ? 2 : 1), t + k * 0.35, 2.6, 13, 0.045, 1400));
  ramp(droneBus.gain, 0, 7, t + 4);
};
M.resume = weights => { if (!M.on) return; ramp(droneBus.gain, 1, 1.5); M.cloud(weights); };
M.phase = () => {};
M.clear = () => { weightsNow = {}; if (!M.on) return; for (const d of Object.values(drones)) ramp(d.g.gain, 0, 1.2); ramp(droneBus.gain, 1, 0.5); };
M.toggle = (weights, phase) => {
  if (!ac) init();
  if (M.on) { M.on = false; ramp(master.gain, 0, 0.4); return; }
  ac.resume && ac.resume();
  M.on = true;
  ramp(master.gain, M.volume * 0.8, 0.6);
  if (!roomVoice) roomVoice = voice(hz(-12));            // гул комнаты: низкое ре, слышно и в тишине
  ramp(roomVoice.g.gain, 0.022, 3);
  ramp(droneBus.gain, phase === 4 ? 0 : 1, 1);
  M.cloud(weights);
};
M.setVolume = v => { M.volume = Math.max(0, Math.min(1, Math.round(v * 10) / 10)); if (M.on) ramp(master.gain, M.volume * 0.8, 0.2); };
M.FAMILY = FAMILY;

root.SalonMusic = M;
})(window);
