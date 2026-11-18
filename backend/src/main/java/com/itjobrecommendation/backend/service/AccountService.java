package com.itjobrecommendation.backend.service;

import com.itjobrecommendation.backend.repository.AccountRepository;
import com.itjobrecommendation.backend.repository.RoleRepository;
import com.itjobrecommendation.backend.repository.UserInteractionRepository;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.server.ResponseStatusException;

import com.itjobrecommendation.backend.dto.AccountCreateDTO;
import com.itjobrecommendation.backend.dto.AccountLoginDTO;
import com.itjobrecommendation.backend.dto.AccountLoginResponseDTO;
import com.itjobrecommendation.backend.dto.AccountViewDTO;
import com.itjobrecommendation.backend.entity.Account;
import com.itjobrecommendation.backend.entity.Role;
import com.itjobrecommendation.backend.entity.enums.RoleEnum;
import com.itjobrecommendation.backend.entity.enums.UserInteractionAction;
import com.itjobrecommendation.backend.notification.service.EmailService;
import com.itjobrecommendation.backend.notification.service.EmailVerificationJwtService;
import com.itjobrecommendation.backend.security.CustomUserDetails;
import com.itjobrecommendation.backend.security.JwtService;

import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
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
    private final UserInteractionRepository userInteractionRepository;

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

    @Transactional(readOnly = true)
    @PreAuthorize("hasRole('ADMIN')")
    public Page<AccountViewDTO> getAccounts(String role, Pageable pageable) {
        Specification<Account> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.isNull(root.get("deletedAt")));

            if (role != null && !role.isBlank()) {
                Join<Account, Role> roleJoin = root.join("role", JoinType.LEFT);
                predicates.add(cb.equal(cb.upper(roleJoin.get("name")), role.trim().toUpperCase()));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<Account> accountsPage = accountRepository.findAll(spec, pageable);
        List<Account> accounts = accountsPage.getContent();
        Map<UUID, Map<UserInteractionAction, Integer>> interactionCountMap = new HashMap<>();

        if (!accounts.isEmpty()) {
            List<UUID> accountIds = accounts.stream().map(Account::getId).toList();
            List<Object[]> interactionCounts = userInteractionRepository.countByAccountIdsGroupedByAction(accountIds);
            for (Object[] row : interactionCounts) {
                UUID accId = (UUID) row[0];
                UserInteractionAction action = (UserInteractionAction) row[1];
                Long count = (Long) row[2];
                interactionCountMap
                        .computeIfAbsent(accId, k -> new EnumMap<>(UserInteractionAction.class))
                        .put(action, count != null ? count.intValue() : 0);
            }
        }

        return accountsPage.map(account -> {
            Map<UserInteractionAction, Integer> counts = interactionCountMap.getOrDefault(account.getId(),
                    Collections.emptyMap());
            int interestedCount = counts.getOrDefault(UserInteractionAction.interest, 0);
            int ignoredCount = counts.getOrDefault(UserInteractionAction.ignore, 0);

            return AccountViewDTO.builder()
                    .email(account.getEmail())
                    .role(account.getRole() != null ? account.getRole().getName() : null)
                    .createdAt(account.getCreatedAt() != null ? account.getCreatedAt().toLocalDateTime() : null)
                    .interestedJobCount(interestedCount)
                    .ignoredJobCount(ignoredCount)
                    .build();
        });
    }

    public Account getCurrentAccount() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new AccessDeniedException("Người dùng chưa được xác thực");
        }

        Object principal = authentication.getPrincipal();
        if (principal instanceof CustomUserDetails userDetails) {
            return accountRepository.findById(userDetails.getId())
                    .orElseThrow(() -> new AccessDeniedException("Không tìm thấy tài khoản hiện tại"));
        }

        throw new AccessDeniedException("Không xác định được danh tính người dùng hiện tại");
    }
}