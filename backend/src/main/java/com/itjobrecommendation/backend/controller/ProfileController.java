package com.itjobrecommendation.backend.controller;

import com.itjobrecommendation.backend.service.ProfileService;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.itjobrecommendation.backend.dto.ProfileCreateDTO;
import com.itjobrecommendation.backend.dto.ProfileViewDTO;

import lombok.RequiredArgsConstructor;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.ModelAttribute;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/profiles")
@RequiredArgsConstructor
public class ProfileController {

    private final ProfileService profileService;

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Void> create(
            @Valid @RequestBody ProfileCreateDTO dto) {
        profileService.create(dto);
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Void> createMultipart(@Valid @ModelAttribute ProfileCreateDTO dto) {
        profileService.create(dto);
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    @PutMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Void> updateMultipart(
            @Valid @ModelAttribute com.itjobrecommendation.backend.dto.ProfileUpdateDTO dto) {
        profileService.update(dto);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/exists")
    public ResponseEntity<Boolean> exists() {
        return ResponseEntity.ok(profileService.hasCurrentProfile());
    }

    @GetMapping()
    public ResponseEntity<ProfileViewDTO> getView() {
        return ResponseEntity.ok(profileService.getView());
    }

}
