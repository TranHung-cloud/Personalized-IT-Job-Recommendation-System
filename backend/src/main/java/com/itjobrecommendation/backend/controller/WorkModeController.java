package com.itjobrecommendation.backend.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.itjobrecommendation.backend.dto.OptionViewDTO;
import com.itjobrecommendation.backend.service.WorkModeService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/work-modes")
@RequiredArgsConstructor
public class WorkModeController {
    private final WorkModeService workModeService;

    @GetMapping
    public ResponseEntity<List<OptionViewDTO>> getAllWorkModes() {
        return ResponseEntity.ok(workModeService.getAllWorkModes());
    }
}
