"use client";

import { useFormStatus } from "react-dom";
import { cn } from "@/lib/utils";

export function ActionButton({
  children,
  className,
  pendingLabel,
  variant = "primary",
  type = "submit",
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  className?: string;
  pendingLabel?: string;
  variant?: "primary" | "secondary" | "ghost";
  type?: "submit" | "button";
  onClick?: () => void;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();

  const base =
    "btn-interactive min-h-11 rounded-xl px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60";

  const variants = {
    primary:
      "bg-emerald-500 text-zinc-950 hover:bg-emerald-400 active:scale-[0.98]",
    secondary:
      "border border-zinc-700 bg-zinc-900/80 text-zinc-100 hover:border-zinc-500 hover:bg-zinc-800 active:scale-[0.98]",
    ghost:
      "border border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:bg-zinc-800/80 active:scale-[0.98]",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={pending || disabled}
      className={cn(base, variants[variant], className)}
    >
      {pending ? (pendingLabel ?? "Сохраняем...") : children}
    </button>
  );
}
