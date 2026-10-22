import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  getPersistedSessionAnalytics,
  formatAnalyticsAsMarkdown,
  type SessionAnalyticsReport,
} from "@/domain/session-analytics";
import { Check, Copy, Share2, Users, MessageSquare, Flame } from "lucide-react";

interface AnalyticsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AnalyticsModal: React.FC<AnalyticsModalProps> = ({
  open,
  onOpenChange,
}) => {
  const [copiedType, setCopiedType] = useState<"md" | "json" | null>(null);
  const analytics: SessionAnalyticsReport = open
    ? getPersistedSessionAnalytics()
    : { totalTurns: 0, activeSpeakersCount: 0, speakers: [], handoffs: [], trajectory: [] };

  const handleCopyMarkdown = () => {
    const md = formatAnalyticsAsMarkdown(analytics);
    navigator.clipboard.writeText(md);
    setCopiedType("md");
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(analytics, null, 2));
    setCopiedType("json");
    setTimeout(() => setCopiedType(null), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col font-mono select-none overflow-hidden">
        <DialogHeader className="border-b border-border/40 pb-3">
          <div className="flex items-center justify-between pr-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <DialogTitle className="text-lg font-normal tracking-tight">
                аналитика круга присутствия
              </DialogTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyMarkdown}
                className="gap-1.5 text-[11px]"
              >
                {copiedType === "md" ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedType === "md" ? "скопировано!" : "отчет (MD)"}</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyJson}
                className="gap-1.5 text-[11px]"
              >
                {copiedType === "json" ? <Check className="w-3.5 h-3.5 text-primary" /> : <Share2 className="w-3.5 h-3.5" />}
                <span>{copiedType === "json" ? "JSON готов" : "JSON"}</span>
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-3 pr-1 text-xs">
          {/* Summary metrics cards */}
          <div className="grid grid-cols-3 gap-2">
            <div className="p-3 bg-secondary/40 border border-border/60 rounded-[2px] flex items-center gap-3">
              <MessageSquare className="w-4 h-4 text-primary shrink-0" />
              <div>
                <div className="text-[10px] text-muted uppercase tracking-wider">высказываний</div>
                <div className="text-base font-bold text-foreground">{analytics.totalTurns}</div>
              </div>
            </div>
            <div className="p-3 bg-secondary/40 border border-border/60 rounded-[2px] flex items-center gap-3">
              <Users className="w-4 h-4 text-primary shrink-0" />
              <div>
                <div className="text-[10px] text-muted uppercase tracking-wider">участников</div>
                <div className="text-base font-bold text-foreground">{analytics.activeSpeakersCount}</div>
              </div>
            </div>
            <div className="p-3 bg-secondary/40 border border-border/60 rounded-[2px] flex items-center gap-3">
              <Flame className="w-4 h-4 text-primary shrink-0" />
              <div>
                <div className="text-[10px] text-muted uppercase tracking-wider">связей диалога</div>
                <div className="text-base font-bold text-foreground">{analytics.handoffs.length}</div>
              </div>
            </div>
          </div>

          {/* Speakers List */}
          <div>
            <div className="text-[11px] font-semibold text-primary mb-2">участники и мысли:</div>
            {analytics.speakers.length === 0 ? (
              <div className="text-muted text-[11px] py-4 text-center border border-dashed border-border/60 rounded-[2px]">
                в этом круге пока не прозвучало фраз
              </div>
            ) : (
              <div className="space-y-2">
                {analytics.speakers.map((spk) => (
                  <div
                    key={spk.speakerId}
                    className="p-3 bg-secondary/20 border border-border/40 rounded-[2px] space-y-2"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                        <span className="font-semibold text-foreground">Спикер {spk.speakerId}</span>
                        <span className="text-muted">({spk.turnCount} реплик)</span>
                      </div>
                      <div className="flex gap-1.5">
                        {Object.entries(spk.feelingsCount).map(([fam, count]) => (
                          <span
                            key={fam}
                            className="px-1.5 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded-[2px] text-[10px]"
                          >
                            {fam} ×{count}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {spk.phrases.map((phrase, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 bg-background border border-border/50 text-foreground/90 rounded-[2px] text-[11px]"
                        >
                          «{phrase}»
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Dialogue Handoffs */}
          {analytics.handoffs.length > 0 && (
            <div>
              <div className="text-[11px] font-semibold text-primary mb-2">динамика передачи слова:</div>
              <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                {analytics.handoffs.map((h, i) => (
                  <div
                    key={i}
                    className="px-2.5 py-1.5 bg-secondary/10 border border-border/30 rounded-[2px] flex items-center justify-between text-[11px]"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-primary font-medium">Спикер {h.fromSpeaker}</span>
                      <span className="text-muted truncate max-w-[140px]">«{h.fromPhrase}»</span>
                      <span className="text-primary/70">→</span>
                      <span className="text-primary font-medium">Спикер {h.toSpeaker}</span>
                      <span className="text-muted truncate max-w-[140px]">«{h.toPhrase}»</span>
                    </div>
                    {h.isSpeakerSwitch && (
                      <span className="text-[9px] text-primary/80 px-1 py-0.2 bg-primary/10 rounded-[2px]">
                        смена голоса
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
