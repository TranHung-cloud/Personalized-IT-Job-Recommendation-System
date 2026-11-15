package com.itjobrecommendation.backend.controller;

import com.itjobrecommendation.backend.service.ProfileService;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.itjobrecommendation.backend.dto.ProfileRequestDTO;
import com.itjobrecommendation.backend.dto.ProfileViewDTO;

import lombok.RequiredArgsConstructor;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
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
            @Valid @RequestBody ProfileRequestDTO dto) {
        profileService.create(dto);
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Void> createMultipart(@Valid @ModelAttribute ProfileRequestDTO dto) {
        profileService.create(dto);
        return ResponseEntity.status(HttpStatus.CREATED).build();
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
