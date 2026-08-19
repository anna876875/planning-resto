package com.restaurant.solver.constraints;

import ai.timefold.solver.core.api.score.buildin.hardmediumsoft.HardMediumSoftScore;
import ai.timefold.solver.core.api.score.stream.Constraint;
import ai.timefold.solver.core.api.score.stream.ConstraintCollectors;
import ai.timefold.solver.core.api.score.stream.ConstraintFactory;
import ai.timefold.solver.core.api.score.stream.ConstraintProvider;
import ai.timefold.solver.core.api.score.stream.Joiners;
import com.restaurant.solver.domain.Absence;
import com.restaurant.solver.domain.Availability;
import com.restaurant.solver.domain.AvailabilityType;
import com.restaurant.solver.domain.ShiftAssignment;

import java.time.DayOfWeek;
import java.time.temporal.ChronoUnit;

/**
 * Moteur de contraintes.
 *
 * Architecture par niveau de priorité :
 *   HARD   → violations BLOCKING (pénalise HardMediumSoftScore.ONE_HARD)
 *   MEDIUM → violations STRONG   (pénalise HardMediumSoftScore.ONE_MEDIUM)
 *   SOFT   → PREFERENCE + OPTIMIZATION (pénalise / récompense ONE_SOFT)
 *
 * Principe fondamental : aucune contrainte SOFT ne peut "racheter" une violation HARD.
 * Timefold garantit cela par l'ordre lexicographique du score HardMediumSoftScore.
 */
public class PlanningConstraintProvider implements ConstraintProvider {

    @Override
    public Constraint[] defineConstraints(ConstraintFactory factory) {
        return new Constraint[]{

                // ══════════════════════════════════════════════════════
                //  HARD — BLOCKING
                // ══════════════════════════════════════════════════════

                requiredSlotMustBeAssigned(factory),
                noAbsenceDuringAssignment(factory),
                noUnavailabilityDuringAssignment(factory),
                noDoubleBooking(factory),
                minimumRestBetweenShifts(factory),
                requiredSkillForPosition(factory),

                // ══════════════════════════════════════════════════════
                //  MEDIUM — STRONG
                // ══════════════════════════════════════════════════════

                targetSlotShouldBeAssigned(factory),
                contractHoursBalance(factory),
                maximumWorkingDaysPerWeek(factory),

                // ══════════════════════════════════════════════════════
                //  SOFT — PREFERENCE + OPTIMIZATION
                // ══════════════════════════════════════════════════════

                rewardPreferredAvailability(factory),
                weekendEquity(factory),
                minimizeLaborCost(factory),
        };
    }

    // ══════════════════════════════════════════════════════════════════
    //  HARD — BLOCKING
    // ══════════════════════════════════════════════════════════════════

    /**
     * Un créneau minimum (isMinimumRequired = true) NON affecté = violation bloquante.
     * La couverture minimale est garantie par cette contrainte.
     */
    Constraint requiredSlotMustBeAssigned(ConstraintFactory factory) {
        return factory.forEach(ShiftAssignment.class)
                .filter(sa -> sa.isMinimumRequired() && !sa.isAssigned())
                .penalize(HardMediumSoftScore.ONE_HARD)
                .asConstraint("Créneau requis non pourvu");
    }

    /**
     * Un employé en absence validée ne peut pas être affecté.
     * Absence = BLOCKING (congés, arrêt maladie, etc.)
     */
    Constraint noAbsenceDuringAssignment(ConstraintFactory factory) {
        return factory.forEach(ShiftAssignment.class)
                .filter(ShiftAssignment::isAssigned)
                .join(Absence.class,
                        Joiners.equal(sa -> sa.getEmployee().getId(), Absence::getEmployeeId))
                .filter((sa, absence) -> absence.covers(sa.getDate()))
                .penalize(HardMediumSoftScore.ONE_HARD)
                .asConstraint("Absence validée non respectée");
    }

    /**
     * Un employé déclaré UNAVAILABLE un jour donné ne peut pas être affecté ce jour-là.
     */
    Constraint noUnavailabilityDuringAssignment(ConstraintFactory factory) {
        return factory.forEach(ShiftAssignment.class)
                .filter(ShiftAssignment::isAssigned)
                .join(Availability.class,
                        Joiners.equal(sa -> sa.getEmployee().getId(), Availability::getEmployeeId),
                        Joiners.equal(sa -> sa.getDate().getDayOfWeek(), Availability::getDayOfWeek))
                .filter((sa, av) -> av.getType() == AvailabilityType.UNAVAILABLE)
                .penalize(HardMediumSoftScore.ONE_HARD)
                .asConstraint("Indisponibilité non respectée");
    }

    /**
     * Un employé ne peut pas avoir deux affectations qui se chevauchent.
     */
    Constraint noDoubleBooking(ConstraintFactory factory) {
        return factory.forEachUniquePair(ShiftAssignment.class,
                        Joiners.equal(ShiftAssignment::getEmployee))
                .filter((sa1, sa2) -> sa1.isAssigned()
                        && overlaps(sa1.getStartDateTime().toLocalTime(), sa1.getDurationHours(),
                        sa2.getStartDateTime().toLocalTime(), sa2.getDurationHours(),
                        sa1.getDate(), sa2.getDate()))
                .penalize(HardMediumSoftScore.ONE_HARD)
                .asConstraint("Double affectation simultanée");
    }

    /**
     * Repos minimum légal de 11h entre la fin d'un shift et le début du suivant.
     */
    Constraint minimumRestBetweenShifts(ConstraintFactory factory) {
        return factory.forEachUniquePair(ShiftAssignment.class,
                        Joiners.equal(ShiftAssignment::getEmployee))
                .filter((sa1, sa2) -> sa1.isAssigned())
                .filter((sa1, sa2) -> {
                    long gap = ChronoUnit.MINUTES.between(
                            sa1.getEndDateTime(), sa2.getStartDateTime());
                    long gapReverse = ChronoUnit.MINUTES.between(
                            sa2.getEndDateTime(), sa1.getStartDateTime());
                    long minGap = Math.min(gap < 0 ? Long.MAX_VALUE : gap,
                            gapReverse < 0 ? Long.MAX_VALUE : gapReverse);
                    return minGap >= 0 && minGap < 11 * 60;
                })
                .penalize(HardMediumSoftScore.ONE_HARD)
                .asConstraint("Repos minimum 11h non respecté");
    }

    /**
     * L'employé affecté doit posséder la compétence requise au niveau demandé.
     */
    Constraint requiredSkillForPosition(ConstraintFactory factory) {
        return factory.forEach(ShiftAssignment.class)
                .filter(sa -> sa.isAssigned()
                        && sa.getRequiredSkillId() != null
                        && !sa.getRequiredSkillId().isBlank())
                .filter(sa -> !sa.getEmployee().hasSkill(
                        sa.getRequiredSkillId(), sa.getRequiredSkillLevel()))
                .penalize(HardMediumSoftScore.ONE_HARD)
                .asConstraint("Compétence requise manquante");
    }

    // ══════════════════════════════════════════════════════════════════
    //  MEDIUM — STRONG
    // ══════════════════════════════════════════════════════════════════

    /**
     * Un créneau de confort (target mais pas minimum) non affecté dégrade le score MEDIUM.
     */
    Constraint targetSlotShouldBeAssigned(ConstraintFactory factory) {
        return factory.forEach(ShiftAssignment.class)
                .filter(sa -> !sa.isMinimumRequired() && !sa.isAssigned())
                .penalize(HardMediumSoftScore.ONE_MEDIUM)
                .asConstraint("Créneau cible non pourvu");
    }

    /**
     * Pénalise l'écart entre les heures planifiées et les heures contractuelles.
     * L'écart est exprimé en demi-heures pour rester dans un entier raisonnable.
     */
    Constraint contractHoursBalance(ConstraintFactory factory) {
        return factory.forEach(ShiftAssignment.class)
                .filter(ShiftAssignment::isAssigned)
                .groupBy(ShiftAssignment::getEmployee,
                        ConstraintCollectors.sum(sa -> (int) (sa.getDurationHours() * 2)))
                .penalize(HardMediumSoftScore.ONE_MEDIUM,
                        (emp, plannedX2) -> {
                            int contractX2 = (int) (emp.getContractHours() * 2);
                            return Math.abs(plannedX2 - contractX2);
                        })
                .asConstraint("Équilibre heures contractuelles");
    }

    /**
     * Maximum 6 jours de travail distincts par semaine (repos légal hebdomadaire).
     */
    Constraint maximumWorkingDaysPerWeek(ConstraintFactory factory) {
        return factory.forEach(ShiftAssignment.class)
                .filter(ShiftAssignment::isAssigned)
                .groupBy(ShiftAssignment::getEmployee,
                        ConstraintCollectors.countDistinct(ShiftAssignment::getDate))
                .filter((emp, dayCount) -> dayCount > 6)
                .penalize(HardMediumSoftScore.ONE_MEDIUM,
                        (emp, dayCount) -> dayCount - 6)
                .asConstraint("Maximum 6 jours travaillés par semaine");
    }

    // ══════════════════════════════════════════════════════════════════
    //  SOFT — PREFERENCE + OPTIMIZATION
    // ══════════════════════════════════════════════════════════════════

    /**
     * Récompense les affectations sur des créneaux marqués PREFERRED par l'employé.
     */
    Constraint rewardPreferredAvailability(ConstraintFactory factory) {
        return factory.forEach(ShiftAssignment.class)
                .filter(ShiftAssignment::isAssigned)
                .join(Availability.class,
                        Joiners.equal(sa -> sa.getEmployee().getId(), Availability::getEmployeeId),
                        Joiners.equal(sa -> sa.getDate().getDayOfWeek(), Availability::getDayOfWeek))
                .filter((sa, av) -> av.getType() == AvailabilityType.PREFERRED)
                .reward(HardMediumSoftScore.ONE_SOFT)
                .asConstraint("Disponibilité préférée respectée");
    }

    /**
     * Équité weekend : pénalise le carré du nombre de créneaux weekend par employé
     * pour favoriser une répartition équitable des week-ends travaillés.
     */
    Constraint weekendEquity(ConstraintFactory factory) {
        return factory.forEach(ShiftAssignment.class)
                .filter(sa -> sa.isAssigned()
                        && (sa.getDate().getDayOfWeek() == DayOfWeek.SATURDAY
                            || sa.getDate().getDayOfWeek() == DayOfWeek.SUNDAY))
                .groupBy(ShiftAssignment::getEmployee, ConstraintCollectors.count())
                .penalize(HardMediumSoftScore.ONE_SOFT,
                        (emp, count) -> count * count)
                .asConstraint("Équité weekend");
    }

    /**
     * Minimisation du coût salarial (en centimes pour éviter les flottants).
     */
    Constraint minimizeLaborCost(ConstraintFactory factory) {
        return factory.forEach(ShiftAssignment.class)
                .filter(ShiftAssignment::isAssigned)
                .penalize(HardMediumSoftScore.ONE_SOFT,
                        sa -> (int) (sa.getEmployee().getHourlyCost()
                                * sa.getDurationHours() * 100))
                .asConstraint("Minimiser le coût salarial");
    }

    // ── Utilitaires ──────────────────────────────────────────────────

    private boolean overlaps(java.time.LocalTime s1, double d1,
                             java.time.LocalTime s2, double d2,
                             java.time.LocalDate date1, java.time.LocalDate date2) {
        java.time.LocalDateTime start1 = java.time.LocalDateTime.of(date1, s1);
        java.time.LocalDateTime end1   = start1.plusMinutes((long) (d1 * 60));
        java.time.LocalDateTime start2 = java.time.LocalDateTime.of(date2, s2);
        java.time.LocalDateTime end2   = start2.plusMinutes((long) (d2 * 60));
        return start1.isBefore(end2) && start2.isBefore(end1);
    }
}
