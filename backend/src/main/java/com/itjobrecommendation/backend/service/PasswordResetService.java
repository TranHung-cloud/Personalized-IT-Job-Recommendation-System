package com.itjobrecommendation.backend.service;

import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.server.ResponseStatusException;

import com.itjobrecommendation.backend.entity.Account;
import com.itjobrecommendation.backend.repository.AccountRepository;
import com.itjobrecommendation.backend.notification.service.EmailService;
import com.itjobrecommendation.backend.notification.service.EmailVerificationJwtService;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class PasswordResetService {
    private final AccountRepository accountRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;
    private final EmailVerificationJwtService emailVerificationJwtService;

    @Transactional
    public void requestReset(String email) {
        accountRepository.findByEmailIgnoreCaseAndDeletedAtIsNull(email)
                .filter(account -> Boolean.TRUE.equals(account.getEnabled()))
                .ifPresent(account -> {
                    String token = emailVerificationJwtService.createPasswordResetToken(account.getId());

                    String recipient = account.getEmail();
                    TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                        @Override
                        public void afterCommit() {
                            emailService.sendPasswordResetEmail(recipient, token);
                        }
                    });
                });
    }

    @Transactional
    public void confirmReset(String token, String newPassword) {
        UUID accountId = emailVerificationJwtService.verifyPasswordResetTokenAndGetAccountId(token);
        Account account = accountRepository.findByIdForUpdate(accountId)
                .filter(candidate -> candidate.getDeletedAt() == null && Boolean.TRUE.equals(candidate.getEnabled()))
                .orElseThrow(this::invalidToken);

        account.setPasswordHash(passwordEncoder.encode(newPassword));
        accountRepository.save(account);
    }

    private ResponseStatusException invalidToken() {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn");
    }
}
