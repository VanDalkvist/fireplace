export async function loadAudioSample(context: BaseAudioContext, url: string): Promise<AudioBuffer> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error(`Audio asset HTTP ${response.status}`);
    const buffer = await context.decodeAudioData(await response.arrayBuffer());
    if (!Number.isFinite(buffer.duration) || buffer.duration <= 0) throw new Error("Invalid decoded audio duration");
    return buffer;
  } catch (cause) {
    throw new Error("Natural fire recording could not be loaded", { cause });
  }
}
