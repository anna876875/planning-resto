"use client";

import { Progress } from "@/components/ui/progress";
import { STEPS } from "@/types/onboarding";
import type { OnboardingStep } from "@/types/onboarding";

interface OnboardingShellProps {
  step: OnboardingStep;
  children: React.ReactNode;
}

export function OnboardingShell({ step, children }: OnboardingShellProps) {
  const stepIndex = STEPS.findIndex((s) => s.key === step);
  const progress = ((stepIndex + 1) / STEPS.length) * 100;

  return (
    <div className="space-y-8">
      {/* Barre de progression */}
      <div className="space-y-3">
        <div className="text-muted-foreground flex justify-between text-xs">
          {STEPS.map((s, i) => (
            <span key={s.key} className={i <= stepIndex ? "text-primary font-medium" : ""}>
              {s.label}
            </span>
          ))}
        </div>
        <Progress value={progress} className="h-2" />
        <p className="text-muted-foreground text-right text-xs">
          Étape {stepIndex + 1} sur {STEPS.length}
        </p>
      </div>

      {/* Contenu de l'étape */}
      {children}
    </div>
  );
}
