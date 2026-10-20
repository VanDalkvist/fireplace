import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface IntroDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEnterCircle: () => void;
}

export const IntroDialog: React.FC<IntroDialogProps> = ({
  open,
  onOpenChange,
  onEnterCircle,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md font-mono select-none">
        <DialogHeader>
          <div className="flex items-center gap-1.5 text-xs text-primary mb-1">
            <span>{`{space}`}</span>
            <span>·</span>
            <span>пятница 05</span>
          </div>
          <DialogTitle className="text-2xl font-normal tracking-tight">
            салон присутствия<span className="text-destructive">.</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-xs text-muted/90 leading-relaxed">
          <p>
            практика участника круга: каждый называет, что чувствует в моменте.
            следующий подхватывает без комментариев и советов.
          </p>

          <div className="border-y border-border/60 py-3 space-y-1.5 text-[11px]">
            <div className="text-foreground">правила круга:</div>
            <div>· говорим от первого лица только о своем чувстве сейчас</div>
            <div>· реплика соединяется нитью с предыдущим участником</div>
            <div>· если говорить не хочется — скажите «пас», это полноценный шаг</div>
            <div>· звук синтезируется прямо в браузере (лад ре дорийский)</div>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <Button variant="primary" size="default" onClick={onEnterCircle}>
            войти в круг →
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
