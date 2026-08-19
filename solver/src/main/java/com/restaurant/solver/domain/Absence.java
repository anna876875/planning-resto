package com.restaurant.solver.domain;

import java.time.LocalDate;

/**
 * Une absence validée est BLOCKING — le solveur ne peut pas assigner
 * un employé sur une période couverte par une absence approuvée.
 */
public class Absence {
    private String id;
    private String employeeId;
    private LocalDate startDate;
    private LocalDate endDate;
    private AbsenceType type;

    public Absence() {}

    public String getId()             { return id; }
    public String getEmployeeId()     { return employeeId; }
    public LocalDate getStartDate()   { return startDate; }
    public LocalDate getEndDate()     { return endDate; }
    public AbsenceType getType()      { return type; }

    public void setId(String id)                    { this.id = id; }
    public void setEmployeeId(String employeeId)    { this.employeeId = employeeId; }
    public void setStartDate(LocalDate startDate)   { this.startDate = startDate; }
    public void setEndDate(LocalDate endDate)       { this.endDate = endDate; }
    public void setType(AbsenceType type)           { this.type = type; }

    public boolean covers(LocalDate date) {
        return !date.isBefore(startDate) && !date.isAfter(endDate);
    }
}
