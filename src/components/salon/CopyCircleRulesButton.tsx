import { useEffect, useState } from "react";
import { Check, Copy, CircleAlert, LoaderCircle } from "lucide-react";
import { CIRCLE_RULES } from "@/content/circle-rules";
import { writeClipboardText } from "@/infrastructure/browser-clipboard";

function useCopyRules() {
  const [status, setStatus] = useState<"idle" | "pending" | "copied" | "error">("idle");
  useEffect(() => {
    if (status !== "copied") return;
    const timer = setTimeout(() => setStatus("idle"), 2000);
    return () => clearTimeout(timer);
  }, [status]);
  const copy = async () => {
    setStatus("pending");
    try {
      await writeClipboardText(CIRCLE_RULES.text, navigator.clipboard);
      setStatus("copied");
    } catch (error) {
      console.warn("[CopyCircleRulesButton] Clipboard write failed:", error instanceof Error ? error.name : "unknown");
      setStatus("error");
    }
  };
  return { status, copy };
}

export const CopyCircleRulesButton = () => {
  const { status, copy } = useCopyRules();
  const Icon = status === "copied" ? Check : status === "pending" ? LoaderCircle : status === "error" ? CircleAlert : Copy;
  return (
    <div className="relative inline-flex pointer-events-auto">
      <button type="button" aria-label="Копировать правила круга" title={status === "copied" ? "Правила скопированы" : "Копировать правила круга"}
        data-status={status} disabled={status === "pending"} onClick={copy} onKeyDown={event => event.stopPropagation()}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-black/20 text-[color:var(--muted)] backdrop-blur-md transition-colors hover:bg-black/50 hover:text-[color:var(--foreground)] focus-visible:outline-1 focus-visible:outline-[var(--ring)] data-[status=copied]:text-[color:var(--primary)] data-[status=error]:text-[color:var(--destructive)] disabled:cursor-wait cursor-pointer">
        <Icon aria-hidden="true" className={status === "pending" ? "h-3.5 w-3.5 motion-safe:animate-spin" : "h-3.5 w-3.5"} />
      </button>
      <span role="status" aria-live="polite"
        className={status === "error" ? "absolute right-0 top-10 z-50 w-[min(18rem,calc(100vw-2rem))] rounded-[2px] bg-[var(--card)]/95 p-3 font-mono text-[11px] text-[color:var(--foreground)] normal-case shadow-xl" : "sr-only"}>
        {status === "copied" ? "Правила скопированы" : status === "error" ? "Не удалось скопировать правила. Проверь доступ к буферу обмена и попробуй снова." : ""}
      </span>
    </div>
  );
};
