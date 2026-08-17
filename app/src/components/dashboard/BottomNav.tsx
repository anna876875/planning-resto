"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, CalendarDays, Users, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Accueil", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/plannings", label: "Planning", icon: CalendarDays, exact: false },
  { href: "/dashboard/equipe", label: "Équipe", icon: Users, exact: false },
  { href: "/dashboard/parametres", label: "Paramètres", icon: Settings, exact: false },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="border-border bg-background fixed right-0 bottom-0 left-0 z-50 border-t md:hidden">
      <div className="flex h-16 items-center justify-around safe-pb">
        {NAV_ITEMS.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex min-w-[64px] flex-col items-center gap-1 rounded-xl px-3 py-2 transition-colors",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium leading-none">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
