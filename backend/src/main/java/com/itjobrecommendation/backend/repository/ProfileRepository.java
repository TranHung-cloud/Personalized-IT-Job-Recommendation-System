package com.itjobrecommendation.backend.repository;

import com.itjobrecommendation.backend.entity.Profile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface ProfileRepository extends JpaRepository<Profile, UUID> {
    Boolean existsByAccount_Id(UUID accountId);
}
