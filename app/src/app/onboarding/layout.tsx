import { CalendarDays } from "lucide-react";

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-muted/20 min-h-screen">
      <header className="bg-background border-border border-b px-6 py-4">
        <div className="mx-auto flex max-w-2xl items-center gap-2">
          <CalendarDays className="text-primary h-5 w-5" />
          <span className="font-semibold">Planning Resto</span>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4 py-10">{children}</main>
    </div>
  );
}
