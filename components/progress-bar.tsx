import { cn } from "@/lib/utils";

export function ProgressBar({
  label,
  value,
  target,
  unit,
  accent = "emerald",
}: {
  label: string;
  value: number;
  target: number;
  unit: string;
  accent?: "emerald" | "sky" | "amber";
}) {
  const percent = target > 0 ? Math.min(100, Math.round((value / target) * 100)) : 0;
  const accentClass =
    accent === "sky"
      ? "bg-sky-400"
      : accent === "amber"
        ? "bg-amber-400"
        : "bg-emerald-400";

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
      <div className="mb-2 flex items-end justify-between gap-3">
        <div>
          <p className="text-sm text-zinc-400">{label}</p>
          <p className="text-2xl font-semibold text-zinc-50">
            {Math.round(value)}
            <span className="text-base font-normal text-zinc-500">
              {" "}
              / {target} {unit}
            </span>
          </p>
        </div>
        <span className="text-sm text-zinc-400">{percent}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
        <div className={cn("h-full rounded-full", accentClass)} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
