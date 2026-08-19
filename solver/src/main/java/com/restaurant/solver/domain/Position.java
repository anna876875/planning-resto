package com.restaurant.solver.domain;

import java.util.List;

public class Position {
    private String id;
    private String name;
    private String department;
    private List<String> requiredSkillIds;
    private int minimumSkillLevel;
    private boolean managerRequired;

    public Position() {}

    public String getId()                          { return id; }
    public String getName()                        { return name; }
    public String getDepartment()                  { return department; }
    public List<String> getRequiredSkillIds()      { return requiredSkillIds; }
    public int getMinimumSkillLevel()              { return minimumSkillLevel; }
    public boolean isManagerRequired()             { return managerRequired; }

    public void setId(String id)                             { this.id = id; }
    public void setName(String name)                         { this.name = name; }
    public void setDepartment(String department)             { this.department = department; }
    public void setRequiredSkillIds(List<String> ids)        { this.requiredSkillIds = ids; }
    public void setMinimumSkillLevel(int minimumSkillLevel)  { this.minimumSkillLevel = minimumSkillLevel; }
    public void setManagerRequired(boolean managerRequired)  { this.managerRequired = managerRequired; }
}
