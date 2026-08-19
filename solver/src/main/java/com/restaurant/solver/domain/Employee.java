package com.restaurant.solver.domain;

import java.util.List;

public class Employee {
    private String id;
    private String firstName;
    private String lastName;
    private ContractType contractType;
    /** Heures contractuelles par semaine */
    private double contractHours;
    /** Coût horaire brut */
    private double hourlyCost;
    private boolean active;
    private List<EmployeeSkill> skills;

    public Employee() {}

    public String getId()                    { return id; }
    public String getFirstName()             { return firstName; }
    public String getLastName()              { return lastName; }
    public String getFullName()              { return firstName + " " + lastName; }
    public ContractType getContractType()    { return contractType; }
    public double getContractHours()         { return contractHours; }
    public double getHourlyCost()            { return hourlyCost; }
    public boolean isActive()                { return active; }
    public List<EmployeeSkill> getSkills()   { return skills; }

    public void setId(String id)                          { this.id = id; }
    public void setFirstName(String firstName)            { this.firstName = firstName; }
    public void setLastName(String lastName)              { this.lastName = lastName; }
    public void setContractType(ContractType contractType){ this.contractType = contractType; }
    public void setContractHours(double contractHours)   { this.contractHours = contractHours; }
    public void setHourlyCost(double hourlyCost)         { this.hourlyCost = hourlyCost; }
    public void setActive(boolean active)                { this.active = active; }
    public void setSkills(List<EmployeeSkill> skills)    { this.skills = skills; }

    /**
     * Vérifie si l'employé possède le niveau de compétence requis pour un poste.
     */
    public boolean hasSkill(String skillId, int minimumLevel) {
        if (skills == null || skillId == null || skillId.isBlank()) return true;
        return skills.stream()
                .anyMatch(es -> es.getSkillId().equals(skillId) && es.getLevel() >= minimumLevel);
    }

    @Override
    public String toString() {
        return "Employee{id='" + id + "', name='" + getFullName() + "'}";
    }
}
