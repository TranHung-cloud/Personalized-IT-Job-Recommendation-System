package com.itjobrecommendation.backend.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.itjobrecommendation.backend.dto.MatchInteractionRequestDTO;
import com.itjobrecommendation.backend.dto.MatchResponseDTO;
import com.itjobrecommendation.backend.dto.UndoInteractionResponseDTO;
import com.itjobrecommendation.backend.entity.Account;
import com.itjobrecommendation.backend.service.AccountService;
import com.itjobrecommendation.backend.service.MatchService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/matches")
@RequiredArgsConstructor
public class MatchController {
    private static final int MAX_EXCLUDED_JOB_IDS = 5;

    private final AccountService accountService;
    private final MatchService matchService;

    @GetMapping
    public ResponseEntity<MatchResponseDTO> getMatches(
            @RequestParam(required = false) String excludeJobIds) {
        Account account = accountService.getCurrentAccount();
        return ResponseEntity.ok(matchService.getMatches(account, parseExcludeJobIds(excludeJobIds)));
    }

    @PostMapping("/{jobId}/interaction")
    public ResponseEntity<Void> saveInteraction(
            @PathVariable UUID jobId,
            @Valid @RequestBody MatchInteractionRequestDTO request) {
        Account account = accountService.getCurrentAccount();
        matchService.saveInteraction(account, jobId, request.getAction());
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{jobId}/interaction")
    public ResponseEntity<UndoInteractionResponseDTO> undoInteraction(@PathVariable UUID jobId) {
        Account account = accountService.getCurrentAccount();
        boolean jobStillEligible = matchService.undoInteraction(account, jobId);
        return ResponseEntity.ok(new UndoInteractionResponseDTO(jobStillEligible));
    }

    private List<UUID> parseExcludeJobIds(String rawIds) {
        if (rawIds == null || rawIds.isBlank()) {
            return List.of();
        }

        List<UUID> ids;
        try {
            ids = java.util.Arrays.stream(rawIds.split(","))
                    .map(String::trim)
                    .map(UUID::fromString)
                    .distinct()
                    .toList();
        } catch (IllegalArgumentException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "excludeJobIds phải là danh sách UUID hợp lệ", exception);
        }

        if (ids.size() > MAX_EXCLUDED_JOB_IDS) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "excludeJobIds chỉ được chứa tối đa 5 ID");
        }
        return ids;
    }
}
