package com.itjobrecommendation.backend.controller;

import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
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

import com.itjobrecommendation.backend.dto.CanonicalItemViewDTO;
import com.itjobrecommendation.backend.dto.CanonicalUpdateRequestDTO;
import com.itjobrecommendation.backend.service.CanonicalService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/admin/canonical")
@RequiredArgsConstructor
public class CanonicalController {

    private final CanonicalService canonicalService;

    @GetMapping
    public ResponseEntity<Page<CanonicalItemViewDTO>> getCanonicalItems(
            @RequestParam(defaultValue = "skill") String type,
            @RequestParam(required = false) String search,
            @PageableDefault(size = 15, sort = "name", direction = Sort.Direction.ASC) Pageable pageable) {
        return ResponseEntity.ok(canonicalService.getCanonicalItems(type, search, pageable));
    }

    @PostMapping
    public ResponseEntity<CanonicalItemViewDTO> createCanonical(
            @Valid @RequestBody CanonicalUpdateRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(canonicalService.createCanonical(request));
    }

    @GetMapping("/check-duplicate")
    public ResponseEntity<Boolean> checkDuplicate(
            @RequestParam String type,
            @RequestParam String name,
            @RequestParam(required = false) UUID excludeId) {
        return ResponseEntity.ok(canonicalService.isDuplicate(type, name, excludeId));
    }

    @DeleteMapping("/{type}/{id}")
    public ResponseEntity<Void> deleteCanonical(
            @PathVariable String type,
            @PathVariable UUID id) {
        canonicalService.deleteCanonical(type, id);
        return ResponseEntity.noContent().build();
    }
}
