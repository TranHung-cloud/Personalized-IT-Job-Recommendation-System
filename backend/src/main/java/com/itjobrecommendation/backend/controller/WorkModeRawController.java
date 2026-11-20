package com.itjobrecommendation.backend.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.itjobrecommendation.backend.dto.MatchRawRequestDTO;
import com.itjobrecommendation.backend.dto.WorkModeRawViewDTO;
import com.itjobrecommendation.backend.entity.enums.RawValueStatus;
import com.itjobrecommendation.backend.service.WorkModeRawService;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

@RestController
@RequestMapping("/api/admin/work-mode-raws")
@RequiredArgsConstructor
public class WorkModeRawController {
    private final WorkModeRawService workModeRawService;

    @GetMapping
    public ResponseEntity<Page<WorkModeRawViewDTO>> getWorkModeRaws(
            @RequestParam(required = false) UUID workModeId,
            @RequestParam(required = false) RawValueStatus status,
            @RequestParam(required = false) String rawName,
            @PageableDefault(size = 10, sort = "rawCount", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(workModeRawService.getWorkModeRaws(workModeId, status, rawName, pageable));
    }

    @PostMapping("/match")
    public ResponseEntity<Void> matchWorkModes(
            @RequestBody List<MatchRawRequestDTO> requestDTOs) {
        workModeRawService.matchWorkModeRawsToCanonical(requestDTOs);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/ignore")
    public ResponseEntity<Void> ignoreRaws(@RequestBody List<String> rawNames) {
        workModeRawService.ignoreRaws(rawNames);
        return ResponseEntity.noContent().build();
    }
}
