import { Content, Trigger } from "@radix-ui/react-dialog";
import { BookOpen, X } from "lucide-react";
import { Dialog, DialogClose, DialogPortal, DialogTitle } from "@/components/ui/dialog";
import { CircleRulesContent } from "./CircleRulesContent";
import "./circle-rules.css";

export const CircleRules = () => (
  <Dialog modal={false}>
    <Trigger asChild>
      <button type="button" aria-label="Правила круга" title="Правила круга" onKeyDown={event => event.stopPropagation()}
        className="pointer-events-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-black/20 text-[color:var(--muted)] backdrop-blur-md transition-colors hover:bg-black/50 hover:text-[color:var(--foreground)] focus-visible:outline-1 focus-visible:outline-[var(--ring)] data-[state=open]:bg-black/60 data-[state=open]:text-[color:var(--primary)]/80 cursor-pointer">
        <BookOpen aria-hidden="true" className="h-3.5 w-3.5" />
      </button>
    </Trigger>
    <DialogPortal>
      <Content aria-describedby={undefined} onKeyDown={event => event.stopPropagation()}
        className="fixed right-4 top-14 z-40 flex max-h-[calc(100dvh-5rem)] w-[min(32rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-[2px] bg-[var(--card)]/95 font-mono text-[13px] leading-relaxed text-[color:var(--card-foreground)] normal-case select-text pointer-events-auto shadow-2xl backdrop-blur-xl outline-none motion-safe:animate-[salon-rules-enter_180ms_ease-out]">
        <div className="flex shrink-0 items-center justify-between gap-4 px-5 py-4">
          <DialogTitle className="text-xs text-[color:var(--primary)]/85">правила круга</DialogTitle>
          <DialogClose type="button" aria-label="Закрыть правила круга"
            className="flex h-7 w-7 items-center justify-center rounded-full text-[color:var(--muted-foreground)] transition-colors hover:bg-white/5 hover:text-[color:var(--foreground)] focus-visible:outline-1 focus-visible:outline-[var(--ring)] cursor-pointer">
            <X aria-hidden="true" className="h-3.5 w-3.5" />
          </DialogClose>
        </div>
        <div role="region" aria-label="Текст правил круга" tabIndex={0}
          className="min-h-0 overflow-y-auto overscroll-contain px-5 pb-5 outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[color:var(--ring)]/40">
          <CircleRulesContent />
        </div>
      </Content>
    </DialogPortal>
  </Dialog>
);
