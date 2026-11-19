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
import com.itjobrecommendation.backend.dto.SkillRawViewDTO;
import com.itjobrecommendation.backend.entity.enums.RawValueStatus;
import com.itjobrecommendation.backend.service.SkillRawService;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

@RestController
@RequestMapping("/api/admin/skill-raws")
@RequiredArgsConstructor
public class SkillRawController {
    private final SkillRawService skillRawService;

    @GetMapping
    public ResponseEntity<Page<SkillRawViewDTO>> getSkillRaws(
            @RequestParam(required = false) UUID skillId,
            @RequestParam(required = false) RawValueStatus status,
            @PageableDefault(size = 10, sort = "rawCount", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(skillRawService.getSkillRaws(skillId, status, pageable));
    }

    @PostMapping("/match")
    public ResponseEntity<Void> matchSkills(@RequestBody List<MatchRawRequestDTO> requestDTO) {
        skillRawService.matchSkillRawsToCanonical(requestDTO);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/ignore")
    public ResponseEntity<Void> ignoreRaws(@RequestBody List<String> rawNames) {
        skillRawService.ignoreRaws(rawNames);
        return ResponseEntity.noContent().build();
    }
}
