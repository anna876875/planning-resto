"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  LayoutDashboard,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const ACCOUNT = { nom: "Anna Vignaud", role: "Gérante" };

const NAV_ITEMS = [
  { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/plannings", label: "Plannings", icon: CalendarDays, exact: false },
  { href: "/dashboard/equipe", label: "Équipe", icon: Users, exact: false },
  { href: "/dashboard/parametres", label: "Paramètres", icon: Settings, exact: false },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "bg-card border-border relative hidden flex-col border-r transition-all duration-200 md:flex",
        collapsed ? "w-16" : "w-56"
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          "border-border flex h-14 items-center border-b px-4",
          collapsed ? "justify-center" : "gap-2"
        )}
      >
        <CalendarDays className="text-primary h-5 w-5 shrink-0" />
        {!collapsed && <span className="text-sm font-bold">Planning Resto</span>}
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col gap-1 p-2">
        {NAV_ITEMS.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
                collapsed && "justify-center px-0"
              )}
              title={collapsed ? label : undefined}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Toggle collapse */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="border-border text-muted-foreground hover:bg-muted absolute top-16 -right-3 flex h-6 w-6 items-center justify-center rounded-full border bg-white shadow-sm transition-colors"
        aria-label={collapsed ? "Agrandir" : "Réduire"}
      >
        {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
      </button>

      {/* Compte connecté */}
      <div className={cn("border-border border-t p-3", collapsed ? "flex justify-center" : "")}>
        {collapsed ? (
          <div className="bg-primary/10 text-primary flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold">
            {ACCOUNT.nom.charAt(0)}
          </div>
        ) : (
          <div className="flex items-center gap-2.5">
            <div className="bg-primary/10 text-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold">
              {ACCOUNT.nom.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold">{ACCOUNT.nom}</p>
              <p className="text-muted-foreground text-[10px]">{ACCOUNT.role}</p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
