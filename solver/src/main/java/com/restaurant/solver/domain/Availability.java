package com.restaurant.solver.domain;

import java.time.DayOfWeek;
import java.time.LocalTime;

public class Availability {
    private String employeeId;
    private DayOfWeek dayOfWeek;
    private LocalTime startTime;
    private LocalTime endTime;
    private AvailabilityType type;

    public Availability() {}

    public String getEmployeeId()       { return employeeId; }
    public DayOfWeek getDayOfWeek()     { return dayOfWeek; }
    public LocalTime getStartTime()     { return startTime; }
    public LocalTime getEndTime()       { return endTime; }
    public AvailabilityType getType()   { return type; }

    public void setEmployeeId(String employeeId)    { this.employeeId = employeeId; }
    public void setDayOfWeek(DayOfWeek dayOfWeek)   { this.dayOfWeek = dayOfWeek; }
    public void setStartTime(LocalTime startTime)   { this.startTime = startTime; }
    public void setEndTime(LocalTime endTime)       { this.endTime = endTime; }
    public void setType(AvailabilityType type)      { this.type = type; }
}
