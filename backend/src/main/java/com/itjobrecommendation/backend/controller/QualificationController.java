package com.itjobrecommendation.backend.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.itjobrecommendation.backend.dto.QualificationViewDTO;
import com.itjobrecommendation.backend.service.QualificationService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/qualifications")
@RequiredArgsConstructor
public class QualificationController {
    private final QualificationService qualificationService;

    @GetMapping
    public ResponseEntity<List<QualificationViewDTO>> getAllQualifications() {
        return ResponseEntity.ok(qualificationService.getAllQualifications());
    }
}
