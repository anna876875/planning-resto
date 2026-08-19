package com.restaurant.solver.api.dto;

public class AssignmentResult {
    private String shiftId;
    private String date;
    private String shiftType;
    private String startTime;
    private String endTime;
    private String serviceId;
    private String positionId;
    private String positionName;
    private String employeeId;
    private String employeeName;
    private boolean assigned;
    private boolean minimumRequired;

    public String getShiftId()        { return shiftId; }
    public String getDate()           { return date; }
    public String getShiftType()      { return shiftType; }
    public String getStartTime()      { return startTime; }
    public String getEndTime()        { return endTime; }
    public String getServiceId()      { return serviceId; }
    public String getPositionId()     { return positionId; }
    public String getPositionName()   { return positionName; }
    public String getEmployeeId()     { return employeeId; }
    public String getEmployeeName()   { return employeeName; }
    public boolean isAssigned()       { return assigned; }
    public boolean isMinimumRequired(){ return minimumRequired; }

    public void setShiftId(String v)        { this.shiftId = v; }
    public void setDate(String v)           { this.date = v; }
    public void setShiftType(String v)      { this.shiftType = v; }
    public void setStartTime(String v)      { this.startTime = v; }
    public void setEndTime(String v)        { this.endTime = v; }
    public void setServiceId(String v)      { this.serviceId = v; }
    public void setPositionId(String v)     { this.positionId = v; }
    public void setPositionName(String v)   { this.positionName = v; }
    public void setEmployeeId(String v)     { this.employeeId = v; }
    public void setEmployeeName(String v)   { this.employeeName = v; }
    public void setAssigned(boolean v)      { this.assigned = v; }
    public void setMinimumRequired(boolean v){ this.minimumRequired = v; }
}
