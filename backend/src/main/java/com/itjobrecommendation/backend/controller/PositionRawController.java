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

import com.itjobrecommendation.backend.dto.PositionRawViewDTO;
import com.itjobrecommendation.backend.entity.enums.RawValueStatus;
import com.itjobrecommendation.backend.service.PositionRawService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/admin/position-raws")
@RequiredArgsConstructor
public class PositionRawController {
    private final PositionRawService positionRawService;

    @GetMapping
    public ResponseEntity<Page<PositionRawViewDTO>> getPositionRaws(
            @RequestParam(required = false) UUID positionId,
            @RequestParam(required = false) RawValueStatus status,
            @PageableDefault(size = 10, sort = "rawCount", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(positionRawService.getPositionRaws(positionId, status, pageable));
    }
}
