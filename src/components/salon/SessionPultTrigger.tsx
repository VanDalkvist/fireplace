import type { RefObject } from "react";

interface Props {
  buttonRef: RefObject<HTMLButtonElement | null>;
  isOpen: boolean;
  onOpen: () => void;
}

export function SessionPultTrigger({ buttonRef, isOpen, onOpen }: Props) {
  return (
    <button
      ref={buttonRef}
      type="button"
      aria-label="Пульт сессии"
      aria-haspopup="dialog"
      aria-expanded={isOpen}
      onClick={onOpen}
      className="shrink-0 rounded-full px-2 h-7 text-[11px] font-mono text-muted-foreground hover:text-foreground focus-visible:outline-1 focus-visible:outline-[var(--ring)]"
    >
      пульт
    </button>
  );
}
