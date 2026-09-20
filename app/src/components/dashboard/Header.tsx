"use client";

import { useState } from "react";
import { Bell, MessageCircle, ChevronDown, Check, Store, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

const RESTAURANTS = [
  { id: "r1", nom: "Le Bistrot du Coin" },
  { id: "r2", nom: "La Brasserie Centrale" },
];

const NOTIFICATIONS = [
  { id: 1, text: "Planning semaine 38 publié", time: "Il y a 2h", unread: true },
  { id: 2, text: "Thomas Martin — CDD expire dans 7 jours", time: "Hier", unread: true },
  { id: 3, text: "Camille Dufour a modifié ses disponibilités", time: "Il y a 3j", unread: false },
];

const SUPPORT_MSGS = [
  {
    id: 1,
    text: "Bienvenue sur Planning Resto ! Contactez-nous depuis cette fenêtre si vous avez des questions.",
    time: "Il y a 5j",
  },
];

export function Header() {
  const [restoId, setRestoId] = useState(RESTAURANTS[0].id);
  const [restoOpen, setRestoOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [readIds, setReadIds] = useState<Set<number>>(new Set());

  const resto = RESTAURANTS.find((r) => r.id === restoId) ?? RESTAURANTS[0];
  const unread = NOTIFICATIONS.filter((n) => n.unread && !readIds.has(n.id)).length;
  const multiResto = RESTAURANTS.length > 1;

  function closeAll() {
    setRestoOpen(false);
    setNotifOpen(false);
    setSupportOpen(false);
  }

  return (
    <header className="border-border bg-background/95 sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b px-4 backdrop-blur-sm">
      {/* Restaurant actif */}
      <div className="relative mr-auto">
        {multiResto ? (
          <button
            onClick={() => {
              closeAll();
              setRestoOpen((o) => !o);
            }}
            className="border-border hover:bg-muted flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors"
          >
            <span className="max-w-[200px] truncate">{resto.nom}</span>
            <ChevronDown
              className={cn(
                "text-muted-foreground h-3.5 w-3.5 transition-transform duration-200",
                restoOpen && "rotate-180"
              )}
            />
          </button>
        ) : (
          <div className="flex items-center gap-2 px-1">
            <Store className="text-muted-foreground h-4 w-4 shrink-0" />
            <span className="text-sm font-medium">{resto.nom}</span>
          </div>
        )}
        {restoOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setRestoOpen(false)} />
            <div className="border-border bg-background absolute top-full left-0 z-20 mt-1 min-w-[220px] overflow-hidden rounded-lg border shadow-lg">
              {RESTAURANTS.map((r) => (
                <button
                  key={r.id}
                  onClick={() => {
                    setRestoId(r.id);
                    setRestoOpen(false);
                  }}
                  className="hover:bg-muted flex w-full items-center justify-between px-3 py-2.5 text-sm transition-colors"
                >
                  <span className={r.id === restoId ? "font-semibold" : ""}>{r.nom}</span>
                  {r.id === restoId && <Check className="text-primary h-3.5 w-3.5" />}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Relancer l'onboarding */}
      <button
        onClick={() => {
          localStorage.removeItem("onboarding_done");
          window.location.href = "/dashboard/plannings";
        }}
        className="text-muted-foreground hover:text-foreground flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-muted"
        title="Relancer la configuration guidée"
      >
        <RotateCcw className="h-4 w-4" />
      </button>

      {/* Support */}
      <div className="relative">
        <button
          onClick={() => {
            closeAll();
            setSupportOpen((o) => !o);
          }}
          className={cn(
            "relative flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-muted",
            supportOpen && "bg-muted"
          )}
          aria-label="Messages du support"
        >
          <MessageCircle className="h-4 w-4" />
        </button>
        {supportOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setSupportOpen(false)} />
            <div className="border-border bg-background absolute top-full right-0 z-20 mt-1 w-72 overflow-hidden rounded-lg border shadow-lg">
              <div className="border-border border-b px-4 py-2.5">
                <p className="text-sm font-semibold">Support</p>
              </div>
              <div className="divide-border divide-y">
                {SUPPORT_MSGS.map((m) => (
                  <div key={m.id} className="px-4 py-3">
                    <p className="text-sm">{m.text}</p>
                    <p className="text-muted-foreground mt-0.5 text-xs">{m.time}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Notifications */}
      <div className="relative">
        <button
          onClick={() => {
            closeAll();
            setNotifOpen((o) => !o);
          }}
          className={cn(
            "relative flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-muted",
            notifOpen && "bg-muted"
          )}
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold leading-none text-white">
              {unread}
            </span>
          )}
        </button>
        {notifOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setNotifOpen(false)} />
            <div className="border-border bg-background absolute top-full right-0 z-20 mt-1 w-80 overflow-hidden rounded-lg border shadow-lg">
              <div className="border-border flex items-center justify-between border-b px-4 py-2.5">
                <p className="text-sm font-semibold">Notifications</p>
                {unread > 0 && (
                  <button
                    onClick={() => setReadIds(new Set(NOTIFICATIONS.map((n) => n.id)))}
                    className="text-primary text-xs hover:underline"
                  >
                    Tout marquer lu
                  </button>
                )}
              </div>
              <div className="divide-border max-h-72 divide-y overflow-y-auto">
                {NOTIFICATIONS.map((n) => {
                  const isUnread = n.unread && !readIds.has(n.id);
                  return (
                    <div key={n.id} className={cn("px-4 py-3", isUnread && "bg-primary/5")}>
                      <div className="flex items-start gap-2.5">
                        {isUnread && (
                          <span className="bg-primary mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" />
                        )}
                        <div className={cn(!isUnread && "pl-4")}>
                          <p className={cn("text-sm", isUnread && "font-medium")}>{n.text}</p>
                          <p className="text-muted-foreground mt-0.5 text-xs">{n.time}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
