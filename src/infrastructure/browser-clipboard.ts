export async function writeClipboardText(
  text: string,
  clipboard: Pick<Clipboard, "writeText"> | undefined,
): Promise<void> {
  if (!clipboard?.writeText) throw new DOMException("Clipboard API is unavailable", "NotSupportedError");
  await clipboard.writeText(text);
}
