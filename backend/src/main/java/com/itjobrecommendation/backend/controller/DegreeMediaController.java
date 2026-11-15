package com.itjobrecommendation.backend.controller;

import java.util.UUID;

import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.itjobrecommendation.backend.service.MediaService;
import com.itjobrecommendation.backend.service.ProfileService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/profiles/degrees")
@RequiredArgsConstructor
public class DegreeMediaController {
    private final ProfileService profileService;

    @GetMapping("/{degreeId}/image")
    public ResponseEntity<byte[]> getDegreeImage(@PathVariable UUID degreeId) {
        MediaService.StoredImage image = profileService.getDegreeImage(degreeId);
        MediaType contentType;
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
