package com.restaurant.solver.domain;

import ai.timefold.solver.core.api.domain.entity.PlanningEntity;
import ai.timefold.solver.core.api.domain.lookup.PlanningId;
import ai.timefold.solver.core.api.domain.variable.PlanningVariable;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;

/**
 * Représente un créneau à pourvoir.
 *
 * Le solveur cherche quel Employee affecter à chaque ShiftAssignment.
 * Un créneau peut rester non affecté (allowsUnassigned = true) :
 * - Les créneaux marqués minimumRequired = true génèrent un score HARD si non affectés.
 * - Les créneaux targetOnly génèrent un score MEDIUM si non affectés.
 */
@PlanningEntity
public class ShiftAssignment {

    @PlanningId
    private String id;

    // ── Faits du problème (immuables pendant la résolution) ─────────

    private LocalDate date;
    private ShiftType shiftType;
    private LocalTime startTime;
    private LocalTime endTime;

    private String serviceId;
    private String positionId;
    private String positionName;

    /** Compétence obligatoire pour ce créneau (peut être null si aucune requise) */
    private String requiredSkillId;
    private int requiredSkillLevel;

    /** true = slot requis par le minimum ; false = slot de confort (target) */
    private boolean minimumRequired;

    // ── Variable de planification ───────────────────────────────────

    @PlanningVariable(allowsUnassigned = true)
    private Employee employee;

    // ── Constructeurs ───────────────────────────────────────────────

    public ShiftAssignment() {}

    public ShiftAssignment(String id, LocalDate date, ShiftType shiftType,
                           LocalTime startTime, LocalTime endTime,
                           String serviceId, String positionId, String positionName,
                           String requiredSkillId, int requiredSkillLevel,
                           boolean minimumRequired) {
        this.id = id;
        this.date = date;
        this.shiftType = shiftType;
        this.startTime = startTime;
        this.endTime = endTime;
        this.serviceId = serviceId;
        this.positionId = positionId;
        this.positionName = positionName;
        this.requiredSkillId = requiredSkillId;
        this.requiredSkillLevel = requiredSkillLevel;
        this.minimumRequired = minimumRequired;
    }

    // ── Helpers calculés ────────────────────────────────────────────

    public double getDurationHours() {
        if (startTime == null || endTime == null) return 0;
        long minutes = startTime.until(endTime, ChronoUnit.MINUTES);
        if (minutes <= 0) minutes += 24 * 60L; // shift de nuit
        return minutes / 60.0;
    }

    public LocalDateTime getStartDateTime() {
        return LocalDateTime.of(date, startTime);
    }

    public LocalDateTime getEndDateTime() {
        LocalDateTime end = LocalDateTime.of(date, endTime);
        if (endTime.isBefore(startTime)) end = end.plusDays(1);
        return end;
    }

    public boolean isAssigned() {
        return employee != null;
    }

    // ── Getters / Setters ───────────────────────────────────────────

    public String getId()                { return id; }
    public LocalDate getDate()           { return date; }
    public ShiftType getShiftType()      { return shiftType; }
    public LocalTime getStartTime()      { return startTime; }
    public LocalTime getEndTime()        { return endTime; }
    public String getServiceId()         { return serviceId; }
    public String getPositionId()        { return positionId; }
    public String getPositionName()      { return positionName; }
    public String getRequiredSkillId()   { return requiredSkillId; }
    public int getRequiredSkillLevel()   { return requiredSkillLevel; }
    public boolean isMinimumRequired()   { return minimumRequired; }
    public Employee getEmployee()        { return employee; }

    public void setId(String id)                          { this.id = id; }
    public void setDate(LocalDate date)                   { this.date = date; }
    public void setShiftType(ShiftType shiftType)         { this.shiftType = shiftType; }
    public void setStartTime(LocalTime startTime)         { this.startTime = startTime; }
    public void setEndTime(LocalTime endTime)             { this.endTime = endTime; }
    public void setServiceId(String serviceId)            { this.serviceId = serviceId; }
    public void setPositionId(String positionId)          { this.positionId = positionId; }
    public void setPositionName(String positionName)      { this.positionName = positionName; }
    public void setRequiredSkillId(String id)             { this.requiredSkillId = id; }
    public void setRequiredSkillLevel(int level)          { this.requiredSkillLevel = level; }
    public void setMinimumRequired(boolean required)      { this.minimumRequired = required; }
    public void setEmployee(Employee employee)             { this.employee = employee; }

    @Override
    public String toString() {
        return "ShiftAssignment{id='" + id + "', date=" + date
                + ", pos=" + positionName + ", emp=" + (employee != null ? employee.getFullName() : "UNASSIGNED") + "}";
    }
}
