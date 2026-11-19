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

import com.itjobrecommendation.backend.dto.LocationRawViewDTO;
import com.itjobrecommendation.backend.dto.MatchRawRequestDTO;
import com.itjobrecommendation.backend.entity.enums.RawValueStatus;
import com.itjobrecommendation.backend.service.LocationRawService;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

@RestController
@RequestMapping("/api/admin/location-raws")
@RequiredArgsConstructor
public class LocationRawController {
    private final LocationRawService locationRawService;

    @GetMapping
    public ResponseEntity<Page<LocationRawViewDTO>> getLocationRaws(
            @RequestParam(required = false) UUID locationId,
            @RequestParam(required = false) RawValueStatus status,
            @PageableDefault(size = 10, sort = "rawCount", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(locationRawService.getLocationRaws(locationId, status, pageable));
    }

    @PostMapping("/match")
    public ResponseEntity<Void> matchLocations(@RequestBody List<MatchRawRequestDTO> requestDTO) {
        locationRawService.matchLocationRawsToCanonical(requestDTO);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/ignore")
    public ResponseEntity<Void> ignoreRaws(@RequestBody List<String> rawNames) {
        locationRawService.ignoreRaws(rawNames);
        return ResponseEntity.noContent().build();
    }

}
