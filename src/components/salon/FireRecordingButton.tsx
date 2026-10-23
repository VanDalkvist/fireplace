interface Props { label: string; position: string; onCycle: () => void }

export const FireRecordingButton = ({ label, position, onCycle }: Props) => (
  <button type="button" aria-label={`Сменить запись костра: ${label}`}
    title={`${label}. Следующая запись; при включённом звуке — сразу прослушать`}
    onClick={onCycle} onKeyDown={event => event.stopPropagation()}
    className="flex items-center gap-1 rounded-full bg-white/5 px-2 py-0.5 text-[color:var(--muted-foreground)] transition-colors hover:bg-white/10 hover:text-[color:var(--foreground)] focus-visible:outline-1 focus-visible:outline-[var(--ring)] cursor-pointer">
    <span className="opacity-50">треск:</span><span>{position}</span>
  </button>
);
