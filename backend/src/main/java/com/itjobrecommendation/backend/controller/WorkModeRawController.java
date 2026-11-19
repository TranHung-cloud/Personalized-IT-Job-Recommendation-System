package com.itjobrecommendation.backend.controller;

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

import com.itjobrecommendation.backend.dto.WorkModeRawViewDTO;
import com.itjobrecommendation.backend.entity.enums.RawValueStatus;
import com.itjobrecommendation.backend.service.WorkModeRawService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/admin/work-mode-raws")
@RequiredArgsConstructor
public class WorkModeRawController {
    private final WorkModeRawService workModeRawService;

    @GetMapping
    public ResponseEntity<Page<WorkModeRawViewDTO>> getWorkModeRaws(
            @RequestParam(required = false) UUID workModeId,
            @RequestParam(required = false) RawValueStatus status,
            @PageableDefault(size = 10, sort = "rawCount", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(workModeRawService.getWorkModeRaws(workModeId, status, pageable));
    }
}
