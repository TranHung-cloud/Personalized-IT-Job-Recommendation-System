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

@RestController
@RequestMapping("/api/profiles")
@RequiredArgsConstructor
public class ProfileController {

    private final ProfileService profileService;

    @PostMapping()
    public ResponseEntity<Void> create(
            @RequestBody ProfileRequestDTO dto) {
        profileService.create(dto);
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    @GetMapping()
    public ResponseEntity<ProfileViewDTO> getView() {
        return ResponseEntity.ok(profileService.getView());
    }

}
