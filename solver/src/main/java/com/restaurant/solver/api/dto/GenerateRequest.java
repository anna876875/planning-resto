package com.restaurant.solver.api.dto;

import com.restaurant.solver.domain.Absence;
import com.restaurant.solver.domain.Availability;
import com.restaurant.solver.domain.Employee;
import com.restaurant.solver.domain.ServicePeriod;

import java.util.List;

/**
 * Corps de la requête POST /api/plannings/generate.
 *
 * Le frontend envoie toutes les données nécessaires dans la requête.
 * Le solver est stateless — pas de base de données pour le MVP.
 */
public class GenerateRequest {

    private String restaurantId;
    private String startDate;   // ISO-8601 : "2026-08-24"
    private String endDate;     // ISO-8601 : "2026-08-30"

    private List<Employee> employees;
    private List<Availability> availabilities;
    private List<Absence> absences;
    private List<ServicePeriod> servicePeriods;

    /** Pondération des objectifs d'optimisation (0.0–1.0) */
    private GenerationObjectives objectives = new GenerationObjectives();

    // ── Getters / Setters ─────────────────────────────────────────

    public String getRestaurantId()             { return restaurantId; }
    public String getStartDate()                { return startDate; }
    public String getEndDate()                  { return endDate; }
    public List<Employee> getEmployees()         { return employees; }
    public List<Availability> getAvailabilities(){ return availabilities; }
    public List<Absence> getAbsences()           { return absences; }
    public List<ServicePeriod> getServicePeriods(){ return servicePeriods; }
    public GenerationObjectives getObjectives()   { return objectives; }

    public void setRestaurantId(String restaurantId)              { this.restaurantId = restaurantId; }
    public void setStartDate(String startDate)                    { this.startDate = startDate; }
    public void setEndDate(String endDate)                        { this.endDate = endDate; }
    public void setEmployees(List<Employee> employees)             { this.employees = employees; }
    public void setAvailabilities(List<Availability> avs)         { this.availabilities = avs; }
    public void setAbsences(List<Absence> absences)               { this.absences = absences; }
    public void setServicePeriods(List<ServicePeriod> periods)    { this.servicePeriods = periods; }
    public void setObjectives(GenerationObjectives objectives)    { this.objectives = objectives; }

    public static class GenerationObjectives {
        private double costWeight        = 0.7;
        private double fairnessWeight    = 0.8;
        private double preferenceWeight  = 0.5;

        public double getCostWeight()       { return costWeight; }
        public double getFairnessWeight()   { return fairnessWeight; }
        public double getPreferenceWeight() { return preferenceWeight; }
        public void setCostWeight(double w)       { this.costWeight = w; }
        public void setFairnessWeight(double w)   { this.fairnessWeight = w; }
        public void setPreferenceWeight(double w) { this.preferenceWeight = w; }
    }
}
