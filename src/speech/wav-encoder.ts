/**
 * Lightweight pure-TS 16kHz Mono 16-bit PCM WAV Encoder.
 * Creates standard RIFF/WAVE byte buffers for Whisper/Sherpa engines without external codecs.
 * Compliance: AP-019 (<= 250 lines), AP-029 (strict TS)
 */

export function encodeWav16kMono(samples: Float32Array): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  // RIFF identifier
  writeString(view, 0, "RIFF");
  // file length minus RIFF identifier & length itself
  view.setUint32(4, 36 + samples.length * 2, true);
  // RIFF type
  writeString(view, 8, "WAVE");
  // format chunk identifier
  writeString(view, 12, "fmt ");
  // format chunk length
  view.setUint32(16, 16, true);
  // sample format (raw PCM = 1)
  view.setUint16(20, 1, true);
  // channel count (mono = 1)
  view.setUint16(22, 1, true);
  // sample rate (16000)
  view.setUint32(24, 16000, true);
  // byte rate (sampleRate * blockAlign = 16000 * 2)
  view.setUint32(28, 32000, true);
  // block align (channelCount * bytesPerSample = 1 * 2)
  view.setUint16(32, 2, true);
  // bits per sample (16)
  view.setUint16(34, 16, true);
  // data chunk identifier
  writeString(view, 36, "data");
  // data chunk length
  view.setUint32(40, samples.length * 2, true);

  // Write 16-bit PCM samples with hard clipping [-1.0, 1.0]
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }

  return new Blob([view], { type: "audio/wav" });
}

function writeString(view: DataView, offset: number, string: string): void {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}
