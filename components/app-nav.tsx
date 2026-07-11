import Link from "next/link";
import { cn } from "@/lib/utils";

const links = [
  { href: "/dashboard", label: "День" },
  { href: "/food", label: "Питание" },
  { href: "/schedule", label: "Календарь" },
  { href: "/progress", label: "Прогресс" },
  { href: "/settings", label: "Настройки" },
];

export function AppNav({ active }: { active: string }) {
  return (
    <nav className="sticky bottom-0 border-t border-zinc-800 bg-zinc-950/95 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-1 px-2 py-2">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "flex min-h-11 min-w-11 flex-1 items-center justify-center rounded-xl px-2 py-2 text-center text-xs font-medium transition",
              active === link.href
                ? "bg-emerald-500/15 text-emerald-300"
                : "text-zinc-400 hover:text-zinc-100",
            )}
          >
            {link.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
