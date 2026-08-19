package com.restaurant.solver.domain;

import ai.timefold.solver.core.api.domain.lookup.PlanningId;
import ai.timefold.solver.core.api.domain.solution.PlanningEntityCollectionProperty;
import ai.timefold.solver.core.api.domain.solution.PlanningScore;
import ai.timefold.solver.core.api.domain.solution.PlanningSolution;
import ai.timefold.solver.core.api.domain.solution.ProblemFactCollectionProperty;
import ai.timefold.solver.core.api.domain.valuerange.ValueRangeProvider;
import ai.timefold.solver.core.api.score.buildin.hardmediumsoft.HardMediumSoftScore;

import java.util.List;

/**
 * Solution complète d'une semaine de planning.
 *
 * Score :
 *  HARD   = violations BLOCKING (absences, repos légal, compétences, couverture minimale)
 *  MEDIUM = violations STRONG (heures contractuelles, jours consécutifs)
 *  SOFT   = PREFERENCE + OPTIMIZATION (préférences, équité, coût)
 */
@PlanningSolution
public class PlanningWeek {

    @PlanningId
    private String id;

    // ── Faits du problème ─────────────────────────────────────────

    @ProblemFactCollectionProperty
    @ValueRangeProvider
    private List<Employee> employees;

    @ProblemFactCollectionProperty
    private List<Availability> availabilities;

    @ProblemFactCollectionProperty
    private List<Absence> absences;

    @ProblemFactCollectionProperty
    private List<ServicePeriod> servicePeriods;

    // ── Entités de planification ──────────────────────────────────

    @PlanningEntityCollectionProperty
    private List<ShiftAssignment> shiftAssignments;

    // ── Score ─────────────────────────────────────────────────────

    @PlanningScore
    private HardMediumSoftScore score;

    // ── Constructeurs ─────────────────────────────────────────────

    public PlanningWeek() {}

    public PlanningWeek(String id,
                        List<Employee> employees,
                        List<Availability> availabilities,
                        List<Absence> absences,
                        List<ServicePeriod> servicePeriods,
                        List<ShiftAssignment> shiftAssignments) {
        this.id = id;
        this.employees = employees;
        this.availabilities = availabilities;
        this.absences = absences;
        this.servicePeriods = servicePeriods;
        this.shiftAssignments = shiftAssignments;
    }

    // ── Getters / Setters ─────────────────────────────────────────

    public String getId()                               { return id; }
    public List<Employee> getEmployees()                { return employees; }
    public List<Availability> getAvailabilities()       { return availabilities; }
    public List<Absence> getAbsences()                  { return absences; }
    public List<ServicePeriod> getServicePeriods()      { return servicePeriods; }
    public List<ShiftAssignment> getShiftAssignments()  { return shiftAssignments; }
    public HardMediumSoftScore getScore()               { return score; }

    public void setId(String id)                                           { this.id = id; }
    public void setEmployees(List<Employee> employees)                     { this.employees = employees; }
    public void setAvailabilities(List<Availability> availabilities)       { this.availabilities = availabilities; }
    public void setAbsences(List<Absence> absences)                        { this.absences = absences; }
    public void setServicePeriods(List<ServicePeriod> servicePeriods)      { this.servicePeriods = servicePeriods; }
    public void setShiftAssignments(List<ShiftAssignment> assignments)     { this.shiftAssignments = assignments; }
    public void setScore(HardMediumSoftScore score)                        { this.score = score; }
}
