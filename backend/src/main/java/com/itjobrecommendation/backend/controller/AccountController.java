package com.itjobrecommendation.backend.controller;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.itjobrecommendation.backend.dto.AccountCreateDTO;
import com.itjobrecommendation.backend.dto.AccountLoginDTO;
import com.itjobrecommendation.backend.dto.AccountLoginResponseDTO;
import com.itjobrecommendation.backend.dto.AccountViewDTO;
import com.itjobrecommendation.backend.dto.EmailVerificationRequest;
import com.itjobrecommendation.backend.service.AccountService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/accounts")
@RequiredArgsConstructor
public class AccountController {
    private final AccountService accountService;

    @GetMapping
    public ResponseEntity<Page<AccountViewDTO>> getAccounts(
            @RequestParam(required = false) String role,
            @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(accountService.getAccounts(role, pageable));
    }

    @PostMapping("/register")
    public ResponseEntity<Void> register(@Valid @RequestBody AccountCreateDTO request) {
        accountService.create(request);
        return ResponseEntity.status(HttpStatus.ACCEPTED).build();
    }

    @PostMapping("/verify-email")
    public ResponseEntity<Void> verifyEmail(@Valid @RequestBody EmailVerificationRequest request) {
        accountService.verifyEmail(request.token());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/login")
    public ResponseEntity<AccountLoginResponseDTO> login(@Valid @RequestBody AccountLoginDTO request) {
        return ResponseEntity.ok(accountService.login(request));
    }
}
