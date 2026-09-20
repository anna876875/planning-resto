"use client";

import { useState } from "react";
import { Smartphone, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { BottomNav } from "@/components/dashboard/BottomNav";

export function DevMobilePreview({ children }: { children: React.ReactNode }) {
  const [active, setActive] = useState(false);

  // En production : comportement normal, BottomNav fixe incluse
  if (process.env.NODE_ENV === "production") {
    return (
      <>
        <main className="flex-1 overflow-y-auto pb-16 md:pb-0">{children}</main>
        <BottomNav />
      </>
    );
  }

  return (
    <>
      {active ? (
        /* ── Vue téléphone — recouvre tout l'écran (sidebar + header inclus) ── */
        <div className="bg-background/95 fixed inset-0 z-[150] flex items-start justify-center overflow-y-auto p-8 backdrop-blur-sm">
          <div className="shrink-0">
            <div className="border-foreground/15 overflow-hidden rounded-[44px] border-[6px] shadow-2xl">
              {/* Pill notch */}
              <div className="bg-foreground/8 flex h-7 items-center justify-center">
                <div className="bg-foreground/20 h-1.5 w-20 rounded-full" />
              </div>

              {/* Écran — transform crée un nouveau contexte pour position:fixed */}
              <div className="relative bg-white" style={{ width: 390, height: 750, transform: "translate(0,0)" }}>
                {/* Contenu scrollable */}
                <div className="h-full overflow-y-auto pb-16">
                  <main>{children}</main>
                </div>

                {/* BottomNav ancrée en bas du cadre */}
                <div className="absolute right-0 bottom-0 left-0">
                  <BottomNav variant="preview" />
                </div>
              </div>
            </div>

            <p className="text-muted-foreground mt-3 text-center text-[11px]">
              iPhone 14 Pro · 390 × 844
            </p>
          </div>
        </div>
      ) : (
        /* ── Vue normale ── */
        <>
          <main className="flex-1 overflow-y-auto pb-16 md:pb-0">{children}</main>
          <BottomNav />
        </>
      )}

      {/* Bouton toggle — dev uniquement */}
      <button
        onClick={() => setActive((a) => !a)}
        className={cn(
          "fixed right-4 bottom-6 z-[200] flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold shadow-lg transition-all select-none",
          active
            ? "bg-foreground text-background"
            : "border-border bg-background text-muted-foreground hover:text-foreground border"
        )}
      >
        {active ? <X className="h-3.5 w-3.5" /> : <Smartphone className="h-3.5 w-3.5" />}
        {active ? "Quitter" : "Mobile"}
      </button>
    </>
  );
}
