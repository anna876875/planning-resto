"use client";

import { useState, useEffect } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { Shift, ShiftType, Employee } from "@/types/planning";

// ─── Presets ─────────────────────────────────────────────────────────────────

const PRESETS: { type: ShiftType; label: string; start: string; end: string; color: string }[] = [
  {
    type: "matin",
    label: "Matin",
    start: "07:00",
    end: "15:00",
    color: "bg-blue-100 text-blue-800 border-blue-300",
  },
  {
    type: "soir",
    label: "Soir",
    start: "15:00",
    end: "23:00",
    color: "bg-violet-100 text-violet-800 border-violet-300",
  },
  {
    type: "coupure",
    label: "Coupure",
    start: "10:00",
    end: "23:00",
    color: "bg-amber-100 text-amber-800 border-amber-300",
  },
  {
    type: "repos",
    label: "Repos",
    start: "",
    end: "",
    color: "bg-muted text-muted-foreground border-border",
  },
];

const JOURS_FR = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
const MOIS_FR = [
  "jan",
  "fév",
  "mar",
  "avr",
  "mai",
  "juin",
  "juil",
  "août",
  "sep",
  "oct",
  "nov",
  "déc",
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface ShiftModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (shift: Omit<Shift, "id"> & { id?: string }) => void;
  onDelete?: (shiftId: string) => void;
  employee: Employee;
  date: string; // YYYY-MM-DD
  existingShift?: Shift;
  locked?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ShiftModal({
  open,
  onClose,
  onSave,
  onDelete,
  employee,
  date,
  existingShift,
  locked = false,
}: ShiftModalProps) {
  const [selectedType, setSelectedType] = useState<ShiftType>("matin");
  const [heureDebut, setHeureDebut] = useState("07:00");
  const [heureFin, setHeureFin] = useState("15:00");

  useEffect(() => {
    if (existingShift) {
      setSelectedType(existingShift.type);
      setHeureDebut(existingShift.start);
      setHeureFin(existingShift.end);
    } else {
      setSelectedType("matin");
      setHeureDebut("07:00");
      setHeureFin("15:00");
    }
  }, [existingShift, open]);

  function applyPreset(preset: (typeof PRESETS)[number]) {
    setSelectedType(preset.type);
    setHeureDebut(preset.start);
    setHeureFin(preset.end);
  }

  function handleSave() {
    onSave({
      id: existingShift?.id,
      employeeId: employee.id,
      date,
      type: selectedType,
      start: selectedType === "repos" ? "" : heureDebut,
      end: selectedType === "repos" ? "" : heureFin,
    });
    onClose();
  }

  function handleDelete() {
    if (existingShift && onDelete) {
      onDelete(existingShift.id);
      onClose();
    }
  }

  const d = new Date(date + "T00:00:00");
  const dateLabel = `${JOURS_FR[d.getDay()]} ${d.getDate()} ${MOIS_FR[d.getMonth()]}`;
  const isEdit = !!existingShift;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Modifier le shift" : "Ajouter un shift"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-1">
          {/* Employé + date */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold">{employee.name}</p>
              <p className="text-muted-foreground text-sm">{dateLabel}</p>
            </div>
            {locked && (
              <span className="text-muted-foreground bg-muted rounded-md px-2 py-1 text-xs font-medium">
                🔒 Verrouillé
              </span>
            )}
          </div>

          {/* Type rapide */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Type de shift</p>
            <div className="grid grid-cols-2 gap-2">
              {PRESETS.map((preset) => (
                <button
                  key={preset.type}
                  type="button"
                  disabled={locked}
                  onClick={() => applyPreset(preset)}
                  className={cn(
                    "rounded-lg border-2 px-3 py-2.5 text-sm font-medium transition-all",
                    selectedType === preset.type
                      ? `${preset.color} border-current ring-2 ring-offset-1`
                      : "border-border hover:border-muted-foreground/30",
                    locked && "cursor-not-allowed opacity-50"
                  )}
                >
                  {preset.label}
                  {preset.start && (
                    <span className="mt-0.5 block text-xs opacity-70">
                      {preset.start} – {preset.end}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Horaires personnalisés */}
          {selectedType !== "repos" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Début</label>
                <input
                  type="time"
                  value={heureDebut}
                  onChange={(e) => setHeureDebut(e.target.value)}
                  disabled={locked}
                  className="border-input bg-background flex h-9 w-full rounded-lg border px-3 py-1 text-sm disabled:opacity-50"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Fin</label>
                <input
                  type="time"
                  value={heureFin}
                  onChange={(e) => setHeureFin(e.target.value)}
                  disabled={locked}
                  className="border-input bg-background flex h-9 w-full rounded-lg border px-3 py-1 text-sm disabled:opacity-50"
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-1">
            {isEdit && onDelete ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDelete}
                disabled={locked}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                Supprimer
              </Button>
            ) : (
              <div />
            )}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={onClose}>
                Annuler
              </Button>
              <Button size="sm" onClick={handleSave} disabled={locked}>
                {isEdit ? "Enregistrer" : "Ajouter"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
