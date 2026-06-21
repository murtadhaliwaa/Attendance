export function TimeCell({ value }: { value: string | null }) {
  return (
    <span dir="ltr" className="inline-block min-w-[4.5rem] text-text-secondary">
      {value ?? "—"}
    </span>
  );
}
