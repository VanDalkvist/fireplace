export const FIRE_RECORDINGS = [
  { id: "dry", label: "Сухой треск", url: new URL("../assets/audio/fire-dry.wav", import.meta.url).href },
  { id: "stove", label: "Печь", url: new URL("../assets/audio/fire-stove.wav", import.meta.url).href },
  { id: "hearth", label: "Камин", url: new URL("../assets/audio/fire-hearth.wav", import.meta.url).href },
  { id: "original", label: "Прежний костёр", url: new URL("../assets/audio/fire-crackling.wav", import.meta.url).href },
] as const;
export const DEFAULT_FIRE_RECORDING_ID = "dry";

export function requireFireRecording(id: string) {
  const recording = FIRE_RECORDINGS.find(item => item.id === id);
  if (!recording) throw new Error(`Fire recording '${id}' is not registered`);
  return recording;
}
