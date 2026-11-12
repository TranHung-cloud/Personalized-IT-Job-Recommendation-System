package com.itjobrecommendation.backend.repository;

import com.itjobrecommendation.backend.entity.Account;
import com.itjobrecommendation.backend.entity.Profile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface ProfileRepository extends JpaRepository<Profile, UUID> {
    Boolean existsByAccount(Account account);

    Optional<Profile> findByAccount(Account account);
}
