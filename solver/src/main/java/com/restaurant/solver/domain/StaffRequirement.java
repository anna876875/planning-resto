package com.restaurant.solver.domain;

import java.util.List;

public class StaffRequirement {
    private String positionId;
    private String positionName;
    private int minimumHeadcount;
    private int targetHeadcount;
    private List<String> requiredSkillIds;
    private int minimumSkillLevel;
    private boolean managerRequired;

    public StaffRequirement() {}

    public String getPositionId()              { return positionId; }
    public String getPositionName()            { return positionName; }
    public int getMinimumHeadcount()           { return minimumHeadcount; }
    public int getTargetHeadcount()            { return targetHeadcount; }
    public List<String> getRequiredSkillIds()  { return requiredSkillIds; }
    public int getMinimumSkillLevel()          { return minimumSkillLevel; }
    public boolean isManagerRequired()         { return managerRequired; }

    public void setPositionId(String positionId)              { this.positionId = positionId; }
    public void setPositionName(String positionName)          { this.positionName = positionName; }
    public void setMinimumHeadcount(int minimumHeadcount)     { this.minimumHeadcount = minimumHeadcount; }
    public void setTargetHeadcount(int targetHeadcount)       { this.targetHeadcount = targetHeadcount; }
    public void setRequiredSkillIds(List<String> ids)         { this.requiredSkillIds = ids; }
    public void setMinimumSkillLevel(int minimumSkillLevel)   { this.minimumSkillLevel = minimumSkillLevel; }
    public void setManagerRequired(boolean managerRequired)   { this.managerRequired = managerRequired; }
}
