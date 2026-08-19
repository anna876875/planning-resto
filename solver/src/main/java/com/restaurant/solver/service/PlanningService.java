package com.restaurant.solver.service;

import ai.timefold.solver.core.api.solver.SolverJob;
import ai.timefold.solver.core.api.solver.SolverManager;
import com.restaurant.solver.api.dto.AssignmentResult;
import com.restaurant.solver.api.dto.GenerateRequest;
import com.restaurant.solver.api.dto.PlanningResponse;
import com.restaurant.solver.domain.*;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.*;
import java.util.concurrent.ExecutionException;

@Service
public class PlanningService {

    private final SolverManager<PlanningWeek, String> solverManager;

    public PlanningService(SolverManager<PlanningWeek, String> solverManager) {
        this.solverManager = solverManager;
    }

    // ── Point d'entrée principal ─────────────────────────────────────

    public PlanningResponse generate(GenerateRequest req)
            throws ExecutionException, InterruptedException {

        PlanningWeek problem = buildProblem(req);

        String jobId = UUID.randomUUID().toString();
        SolverJob<PlanningWeek, String> job = solverManager.solve(jobId, problem);
        PlanningWeek solution = job.getFinalBestSolution();

        return buildResponse(jobId, solution, req);
    }

    // ── Construction du problème Timefold ────────────────────────────

    private PlanningWeek buildProblem(GenerateRequest req) {
        List<ShiftAssignment> assignments = new ArrayList<>();
        int slotCounter = 0;

        if (req.getServicePeriods() != null) {
            for (ServicePeriod sp : req.getServicePeriods()) {
                if (sp.getRequirements() == null) continue;

                for (StaffRequirement sr : sp.getRequirements()) {
                    int target = Math.max(sr.getTargetHeadcount(), sr.getMinimumHeadcount());
                    String skillId = sr.getRequiredSkillIds() != null && !sr.getRequiredSkillIds().isEmpty()
                            ? sr.getRequiredSkillIds().get(0) : null;

                    for (int i = 0; i < target; i++) {
                        boolean isMinimum = i < sr.getMinimumHeadcount();
                        assignments.add(new ShiftAssignment(
                                "slot-" + slotCounter++,
                                sp.getDate(),
                                sp.getShiftType(),
                                sp.getStartTime(),
                                sp.getEndTime(),
                                sp.getId(),
                                sr.getPositionId(),
                                sr.getPositionName() != null ? sr.getPositionName() : sr.getPositionId(),
                                skillId,
                                sr.getMinimumSkillLevel(),
                                isMinimum
                        ));
                    }
                }
            }
        }

        return new PlanningWeek(
                UUID.randomUUID().toString(),
                req.getEmployees() != null ? req.getEmployees() : List.of(),
                req.getAvailabilities() != null ? req.getAvailabilities() : List.of(),
                req.getAbsences() != null ? req.getAbsences() : List.of(),
                req.getServicePeriods() != null ? req.getServicePeriods() : List.of(),
                assignments
        );
    }

    // ── Conversion solution → réponse ─────────────────────────────────

    private PlanningResponse buildResponse(String jobId, PlanningWeek solution,
                                           GenerateRequest req) {
        PlanningResponse resp = new PlanningResponse();
        resp.setPlanningId(jobId);

        var score = solution.getScore();
        int hard   = score != null ? score.hardScore()   : 0;
        int medium = score != null ? score.mediumScore() : 0;
        int soft   = score != null ? score.softScore()   : 0;

        resp.setHardScore(hard);
        resp.setMediumScore(medium);
        resp.setSoftScore(soft);

        // Statut
        if (hard < 0) {
            resp.setStatus(PlanningResponse.PlanningStatus.INVALID);
        } else if (medium < 0) {
            resp.setStatus(PlanningResponse.PlanningStatus.WARNING);
        } else {
            resp.setStatus(PlanningResponse.PlanningStatus.VALID);
        }

        // Score global 0–100 (approximation)
        resp.setOverallScore(computeOverallScore(hard, medium, soft, solution));

        // KPIs
        List<ShiftAssignment> all = solution.getShiftAssignments();
        resp.setTotalLaborCost(computeTotalCost(all));
        resp.setCoverageRate(computeCoverageRate(all));

        // Affectations
        List<AssignmentResult> results = new ArrayList<>();
        for (ShiftAssignment sa : all) {
            AssignmentResult ar = new AssignmentResult();
            ar.setShiftId(sa.getId());
            ar.setDate(sa.getDate().toString());
            ar.setShiftType(sa.getShiftType().name());
            ar.setStartTime(sa.getStartTime() != null ? sa.getStartTime().toString() : null);
            ar.setEndTime(sa.getEndTime() != null ? sa.getEndTime().toString() : null);
            ar.setServiceId(sa.getServiceId());
            ar.setPositionId(sa.getPositionId());
            ar.setPositionName(sa.getPositionName());
            ar.setAssigned(sa.isAssigned());
            ar.setMinimumRequired(sa.isMinimumRequired());
            if (sa.isAssigned()) {
                ar.setEmployeeId(sa.getEmployee().getId());
                ar.setEmployeeName(sa.getEmployee().getFullName());
            }
            results.add(ar);
        }
        resp.setAssignments(results);

        // Alertes & explications
        resp.setWarnings(buildWarnings(solution));
        resp.setExplanations(buildExplanations(solution));
        resp.setConflicts(buildConflicts(solution));

        return resp;
    }

    // ── KPI helpers ───────────────────────────────────────────────────

    private double computeTotalCost(List<ShiftAssignment> assignments) {
        return assignments.stream()
                .filter(ShiftAssignment::isAssigned)
                .mapToDouble(sa -> sa.getEmployee().getHourlyCost() * sa.getDurationHours())
                .sum();
    }

    private double computeCoverageRate(List<ShiftAssignment> assignments) {
        if (assignments.isEmpty()) return 1.0;
        long required = assignments.stream().filter(ShiftAssignment::isMinimumRequired).count();
        long covered  = assignments.stream()
                .filter(sa -> sa.isMinimumRequired() && sa.isAssigned()).count();
        return required == 0 ? 1.0 : (double) covered / required;
    }

    private int computeOverallScore(int hard, int medium, int soft,
                                    PlanningWeek solution) {
        if (hard < 0) return Math.max(0, 40 + hard * 5);
        int base = 100;
        base += medium * 2;  // medium < 0 → pénalise
        base = Math.max(0, Math.min(100, base));
        return base;
    }

    // ── Messages lisibles ─────────────────────────────────────────────

    private List<String> buildWarnings(PlanningWeek solution) {
        List<String> warnings = new ArrayList<>();
        List<ShiftAssignment> all = solution.getShiftAssignments();

        long unfilledRequired = all.stream()
                .filter(sa -> sa.isMinimumRequired() && !sa.isAssigned()).count();
        if (unfilledRequired > 0) {
            warnings.add(unfilledRequired + " créneau(x) obligatoire(s) non pourvu(s).");
        }

        long unfilledTarget = all.stream()
                .filter(sa -> !sa.isMinimumRequired() && !sa.isAssigned()).count();
        if (unfilledTarget > 0) {
            warnings.add(unfilledTarget + " créneau(x) cible(s) non pourvu(s).");
        }

        // Heures hors contrat par employé
        Map<String, Double> hoursMap = new HashMap<>();
        for (ShiftAssignment sa : all) {
            if (sa.isAssigned()) {
                hoursMap.merge(sa.getEmployee().getId(),
                        sa.getDurationHours(), Double::sum);
            }
        }
        if (solution.getEmployees() != null) {
            for (Employee emp : solution.getEmployees()) {
                double planned = hoursMap.getOrDefault(emp.getId(), 0.0);
                double delta   = planned - emp.getContractHours();
                if (delta > 2) {
                    warnings.add(emp.getFullName() + " : +"
                            + String.format("%.1f", delta) + "h par rapport au contrat.");
                }
            }
        }
        return warnings;
    }

    private List<String> buildExplanations(PlanningWeek solution) {
        List<String> expl = new ArrayList<>();
        int assigned = (int) solution.getShiftAssignments().stream()
                .filter(ShiftAssignment::isAssigned).count();
        int total    = solution.getShiftAssignments().size();
        expl.add(assigned + " affectations sur " + total + " créneaux.");

        double cost = computeTotalCost(solution.getShiftAssignments());
        expl.add("Coût salarial estimé : " + String.format("%.2f", cost) + " €.");
        return expl;
    }

    private List<String> buildConflicts(PlanningWeek solution) {
        List<String> conflicts = new ArrayList<>();
        var score = solution.getScore();
        if (score != null && score.hardScore() < 0) {
            conflicts.add("Contraintes bloquantes détectées (" + Math.abs(score.hardScore())
                    + " violation(s)). Le planning ne peut pas être publié en l'état.");
        }
        return conflicts;
    }
}
