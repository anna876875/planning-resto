"use client";

import { PlanningView } from "@/components/planning/PlanningView";

export default function DashboardPage() {
  return (
    <div className="flex flex-1 min-h-0 flex-col overflow-hidden">
      <PlanningView />
    </div>
  );
}
