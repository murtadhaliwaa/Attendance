import { cn } from "@/lib/utils";

const selectedClasses =
  "border-blue-primary bg-blue-primary/15 text-text-primary shadow-[inset_0_0_0_1px_rgba(123,143,168,0.35)]";
const unselectedClasses =
  "border-bg-border bg-bg-card text-text-secondary hover:border-blue-primary/40 hover:bg-bg-elevated";

interface SelectionCardProps {
  title: string;
  subtitle?: string;
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
}

export function SelectionCard({
  title,
  subtitle,
  selected,
  disabled,
  onClick,
}: SelectionCardProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "rounded-lg border px-3 py-2.5 text-start text-sm transition-all disabled:opacity-50",
        selected ? selectedClasses : unselectedClasses
      )}
    >
      <span className="block font-medium">{title}</span>
      {subtitle ? (
        <span
          className={cn(
            "mt-0.5 block text-xs",
            selected ? "text-text-secondary" : "text-text-muted"
          )}
        >
          {subtitle}
        </span>
      ) : null}
    </button>
  );
}
