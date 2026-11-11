package com.itjobrecommendation.backend.service;

import com.itjobrecommendation.backend.repository.AccountRepository;
import com.itjobrecommendation.backend.repository.RoleRepository;

import java.time.OffsetDateTime;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.itjobrecommendation.backend.dto.AccountCreateDTO;
import com.itjobrecommendation.backend.entity.Account;
import com.itjobrecommendation.backend.entity.Role;
import com.itjobrecommendation.backend.entity.enums.RoleEnum;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AccountService {
    private final ProfileService profileService;
    private final AccountRepository accountRepository;
    private final PasswordEncoder passwordEncoder;
    private final RoleRepository roleRepository;

    @Transactional
    public void create(AccountCreateDTO dto) {
        Role role = roleRepository.findByNameIgnoreCase(RoleEnum.USER.getRoleName())
                .orElseThrow(
                        () -> new IllegalArgumentException("Không tìm thấy role: " + RoleEnum.USER.getDisplayName()));
        Account account = new Account();
        account.setEmail(dto.getEmail());
        account.setPasswordHash(passwordEncoder.encode(dto.getPassword()));
        account.setCreatedAt(OffsetDateTime.now());
        account.setRole(role);
        account = accountRepository.save(account);
        if (dto.getProfile() != null) {
            dto.getProfile().setAccId(account.getId());
            profileService.create(dto.getProfile());
        }
    }
}