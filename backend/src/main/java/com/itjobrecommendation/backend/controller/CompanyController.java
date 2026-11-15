package com.itjobrecommendation.backend.controller;

import java.util.List;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.itjobrecommendation.backend.dto.CompanySuggestionDTO;
import com.itjobrecommendation.backend.service.CompanyService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/companies")
@RequiredArgsConstructor
public class CompanyController {
    private final CompanyService companyService;

    @GetMapping("/search")
    public ResponseEntity<List<CompanySuggestionDTO>> searchCompanies(
            @RequestParam(defaultValue = "") String keyword,
            HttpServletRequest request) {
        return ResponseEntity.ok(companyService.searchCompanies(keyword, request.getRemoteAddr()));
    }
}
