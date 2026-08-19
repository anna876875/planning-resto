package com.restaurant.solver.api.dto;

import java.util.List;

/**
 * Réponse de POST /api/plannings/generate.
 *
 * status :
 *   VALID   → hardScore = 0, plannable tel quel
 *   WARNING → hardScore = 0 mais mediumScore < 0 (contraintes STRONG violées)
 *   INVALID → hardScore < 0 (contraintes BLOCKING violées — ne doit pas être publié)
 */
public class PlanningResponse {

    public enum PlanningStatus { VALID, WARNING, INVALID }

    private String planningId;
    private PlanningStatus status;

    // Score
    private int hardScore;
    private int mediumScore;
    private int softScore;
    private int overallScore; // 0–100, calculé par le service

    // KPIs
    private double totalLaborCost;
    private double coverageRate;      // 0.0–1.0
    private double fairnessScore;     // 0.0–1.0 (symétrie des weekends/heures)
    private double preferenceScore;   // 0.0–1.0

    // Détail
    private List<AssignmentResult> assignments;
    private List<String> warnings;
    private List<String> explanations;
    private List<String> conflicts;

    // ── Getters / Setters ─────────────────────────────────────────

    public String getPlanningId()           { return planningId; }
    public PlanningStatus getStatus()       { return status; }
    public int getHardScore()               { return hardScore; }
    public int getMediumScore()             { return mediumScore; }
    public int getSoftScore()               { return softScore; }
    public int getOverallScore()            { return overallScore; }
    public double getTotalLaborCost()       { return totalLaborCost; }
    public double getCoverageRate()         { return coverageRate; }
    public double getFairnessScore()        { return fairnessScore; }
    public double getPreferenceScore()      { return preferenceScore; }
    public List<AssignmentResult> getAssignments(){ return assignments; }
    public List<String> getWarnings()       { return warnings; }
    public List<String> getExplanations()   { return explanations; }
    public List<String> getConflicts()      { return conflicts; }

    public void setPlanningId(String v)               { this.planningId = v; }
    public void setStatus(PlanningStatus v)           { this.status = v; }
    public void setHardScore(int v)                   { this.hardScore = v; }
    public void setMediumScore(int v)                 { this.mediumScore = v; }
    public void setSoftScore(int v)                   { this.softScore = v; }
    public void setOverallScore(int v)                { this.overallScore = v; }
    public void setTotalLaborCost(double v)           { this.totalLaborCost = v; }
    public void setCoverageRate(double v)             { this.coverageRate = v; }
    public void setFairnessScore(double v)            { this.fairnessScore = v; }
    public void setPreferenceScore(double v)          { this.preferenceScore = v; }
    public void setAssignments(List<AssignmentResult> v){ this.assignments = v; }
    public void setWarnings(List<String> v)           { this.warnings = v; }
    public void setExplanations(List<String> v)       { this.explanations = v; }
    public void setConflicts(List<String> v)          { this.conflicts = v; }
}
