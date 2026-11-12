package com.itjobrecommendation.backend.service;

import com.itjobrecommendation.backend.repository.AccountRepository;
import com.itjobrecommendation.backend.repository.RoleRepository;

import java.time.OffsetDateTime;
import java.util.UUID;

import org.springframework.boot.data.autoconfigure.web.DataWebProperties.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.server.ResponseStatusException;

import com.itjobrecommendation.backend.dto.AccountCreateDTO;
import com.itjobrecommendation.backend.dto.AccountLoginDTO;
import com.itjobrecommendation.backend.dto.AccountLoginResponseDTO;
import com.itjobrecommendation.backend.entity.Account;
import com.itjobrecommendation.backend.entity.Role;
import com.itjobrecommendation.backend.entity.enums.RoleEnum;
import com.itjobrecommendation.backend.notification.service.EmailService;
import com.itjobrecommendation.backend.notification.service.EmailVerificationJwtService;
import com.itjobrecommendation.backend.security.JwtService;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AccountService {
    private final AccountRepository accountRepository;
    private final PasswordEncoder passwordEncoder;
    private final RoleRepository roleRepository;
    private final EmailVerificationJwtService verificationJwtService;
    private final EmailService emailService;
    private final JwtService jwtService;

    @Transactional
    public void create(AccountCreateDTO dto) {
        if (accountRepository.existsByEmailIgnoreCaseAndDeletedAtIsNull(dto.getEmail())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email đã được đăng ký");
        }

        Role role = roleRepository.findByNameIgnoreCase(RoleEnum.USER.getRoleName())
                .orElseThrow(
                        () -> new IllegalArgumentException("Không tìm thấy role: " + RoleEnum.USER.getDisplayName()));
        Account account = new Account();
        account.setEmail(dto.getEmail());
        account.setPasswordHash(passwordEncoder.encode(dto.getPassword()));
        account.setCreatedAt(OffsetDateTime.now());
        account.setRole(role);
        account.setEnabled(false);
        account = accountRepository.save(account);

        String verificationJwt = verificationJwtService.create(account.getId());
        String email = account.getEmail();
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                emailService.sendVerificationEmail(email, verificationJwt);
            }
        });
    }

    @Transactional
    public void verifyEmail(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Token xác minh không hợp lệ");
        }

        UUID accountId = verificationJwtService.verifyAndGetAccountId(rawToken);
        Account account = accountRepository.findByIdForUpdate(accountId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tài khoản không tồn tại"));
        if (Boolean.TRUE.equals(account.getEnabled())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email đã được xác minh");
        }
        account.setEnabled(true);
    }

    @Transactional(readOnly = true)
    public AccountLoginResponseDTO login(AccountLoginDTO dto) {
        Account account = accountRepository.findByEmailIgnoreCaseAndDeletedAtIsNull(dto.getEmail())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                        "Email hoặc mật khẩu không chính xác"));

        if (!Boolean.TRUE.equals(account.getEnabled())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Tài khoản chưa được kích hoạt qua email");
        }

        if (!passwordEncoder.matches(dto.getPassword(), account.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Email hoặc mật khẩu không chính xác");
        }

        String token = jwtService.generateToken(account);
        return AccountLoginResponseDTO.builder()
                .accessToken(token)
                .tokenType("Bearer")
                .expiresIn(jwtService.getExpirationSeconds())
                .id(account.getId())
                .email(account.getEmail())
                .role(account.getRole() != null ? account.getRole().getName() : null)
                .build();
    }
}
