package com.restaurant.solver.domain;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

public class ServicePeriod {
    private String id;
    private LocalDate date;
    private ShiftType shiftType;
    private LocalTime startTime;
    private LocalTime endTime;
    private int expectedCovers;
    private double expectedRevenue;
    /** 0.0–1.0 : fraction de l'intensité maximale du service */
    private double intensity;
    private List<StaffRequirement> requirements;

    public ServicePeriod() {}

    public String getId()                          { return id; }
    public LocalDate getDate()                     { return date; }
    public ShiftType getShiftType()                { return shiftType; }
    public LocalTime getStartTime()                { return startTime; }
    public LocalTime getEndTime()                  { return endTime; }
    public int getExpectedCovers()                 { return expectedCovers; }
    public double getExpectedRevenue()             { return expectedRevenue; }
    public double getIntensity()                   { return intensity; }
    public List<StaffRequirement> getRequirements(){ return requirements; }

    public void setId(String id)                              { this.id = id; }
    public void setDate(LocalDate date)                       { this.date = date; }
    public void setShiftType(ShiftType shiftType)             { this.shiftType = shiftType; }
    public void setStartTime(LocalTime startTime)             { this.startTime = startTime; }
    public void setEndTime(LocalTime endTime)                 { this.endTime = endTime; }
    public void setExpectedCovers(int expectedCovers)         { this.expectedCovers = expectedCovers; }
    public void setExpectedRevenue(double expectedRevenue)    { this.expectedRevenue = expectedRevenue; }
    public void setIntensity(double intensity)                { this.intensity = intensity; }
    public void setRequirements(List<StaffRequirement> reqs)  { this.requirements = reqs; }
}
