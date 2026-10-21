import React, { useState, useEffect, useRef } from "react";

interface HearthInputProps {
  isOpen: boolean;
  activeSpeakerId: number;
  engineStatus: { online: boolean; hasModel: boolean };
  onClose: () => void;
  onSubmit: (text: string) => void;
}

export const HearthInput: React.FC<HearthInputProps> = ({
  isOpen,
  activeSpeakerId,
  engineStatus,
  onClose,
  onSubmit,
}) => {
  const [val, setVal] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setVal("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = val.trim();
    if (clean) {
      onSubmit(clean);
      setVal("");
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    }
  };

  return (
    <div className="fixed inset-x-0 bottom-16 z-30 flex justify-center px-4 pointer-events-auto">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg bg-[#080808]/95 border border-[#ffb266]/30 backdrop-blur-md px-3 py-2 rounded-[2px] shadow-2xl flex items-center gap-2 text-xs font-mono"
      >
        <span className="text-[#ffb266] shrink-0 font-bold">
          {`[${activeSpeakerId < 10 ? `0${activeSpeakerId}` : activeSpeakerId}]`}
        </span>
        <input
          ref={inputRef}
          type="text"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="что ты чувствуешь сейчас? (Enter отправить, Esc закрыть)"
          className="flex-1 bg-transparent border-none text-[#ece4d6] placeholder:text-[#ece4d6]/40 focus:outline-none text-xs"
        />
        <div className="flex items-center gap-1.5 shrink-0 text-[10px]">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              engineStatus.hasModel ? "bg-[#34d399]" : "bg-[#ffb266]"
            }`}
          />
          <span className="text-[#ece4d6]/60">
            {engineStatus.hasModel ? "qwen2.5" : "словарь"}
          </span>
        </div>
      </form>
    </div>
  );
};
