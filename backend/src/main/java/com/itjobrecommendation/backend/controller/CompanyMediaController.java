package com.itjobrecommendation.backend.controller;

import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.itjobrecommendation.backend.service.CompanyService;
import com.itjobrecommendation.backend.service.MediaService;

import lombok.RequiredArgsConstructor;

import java.util.UUID;

import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@RestController
@RequestMapping("/api/companies")
@RequiredArgsConstructor
public class CompanyMediaController {
    private final CompanyService companyService;

    @GetMapping("/{companyId}/logo")
    public ResponseEntity<byte[]> getCompanyLogo(@PathVariable UUID companyId) {
        MediaService.StoredImage image = companyService.getLogoImageForCompany(companyId);
        MediaType contentType;
        if (image == null) {
            return ResponseEntity.notFound().build();
        }
        try {
            contentType = MediaType.parseMediaType(image.contentType());
        } catch (IllegalArgumentException exception) {
            contentType = MediaType.APPLICATION_OCTET_STREAM;
        }

        return ResponseEntity.ok()
                .contentType(contentType)
                .cacheControl(CacheControl.noStore())
                .header("X-Content-Type-Options", "nosniff")
                .body(image.bytes());
    }

}
