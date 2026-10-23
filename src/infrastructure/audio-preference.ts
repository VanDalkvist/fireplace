const KEY = "salon_audio_enabled";
type PreferenceStorage = Pick<Storage, "getItem" | "setItem">;

export function readAudioEnabled(storage?: PreferenceStorage): boolean {
  try {
    const source = storage ?? (typeof window !== "undefined" ? window.localStorage : undefined);
    return source?.getItem(KEY) === "true";
  } catch { console.warn("[salon] Cannot read sound preference"); return false; }
}

export function writeAudioEnabled(enabled: boolean, storage?: PreferenceStorage): void {
  try {
    const target = storage ?? (typeof window !== "undefined" ? window.localStorage : undefined);
    target?.setItem(KEY, String(enabled));
  } catch { console.warn("[salon] Cannot persist sound preference"); }
}
