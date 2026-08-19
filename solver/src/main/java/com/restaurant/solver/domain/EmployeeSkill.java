package com.restaurant.solver.domain;

public class EmployeeSkill {
    private String skillId;
    private int level;      // 1–5
    private boolean certified;

    public EmployeeSkill() {}
    public EmployeeSkill(String skillId, int level, boolean certified) {
        this.skillId = skillId; this.level = level; this.certified = certified;
    }

    public String getSkillId()    { return skillId; }
    public int getLevel()         { return level; }
    public boolean isCertified()  { return certified; }
    public void setSkillId(String skillId)    { this.skillId = skillId; }
    public void setLevel(int level)           { this.level = level; }
    public void setCertified(boolean c)       { this.certified = c; }
}
