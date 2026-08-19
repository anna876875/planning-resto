package com.restaurant.solver.api;

import com.restaurant.solver.api.dto.GenerateRequest;
import com.restaurant.solver.api.dto.PlanningResponse;
import com.restaurant.solver.service.PlanningService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.concurrent.ExecutionException;

@RestController
@RequestMapping("/api/plannings")
@CrossOrigin(origins = "*")
public class PlanningController {

    private final PlanningService planningService;

    public PlanningController(PlanningService planningService) {
        this.planningService = planningService;
    }

    /**
     * Génère un planning optimisé.
     *
     * POST /api/plannings/generate
     * Body : GenerateRequest (employees, availabilities, absences, servicePeriods, objectives)
     *
     * Retourne : PlanningResponse (status, assignments, score, KPIs, warnings, explanations)
     */
    @PostMapping("/generate")
    public ResponseEntity<?> generate(@RequestBody GenerateRequest request) {
        try {
            PlanningResponse response = planningService.generate(request);
            return ResponseEntity.ok(response);
        } catch (ExecutionException | InterruptedException e) {
            Thread.currentThread().interrupt();
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Échec de la résolution : " + e.getMessage()));
        }
    }

    /**
     * Sanity-check.
     * GET /api/plannings/health
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> health() {
        return ResponseEntity.ok(Map.of("status", "ok", "solver", "timefold-1.13"));
    }
}
