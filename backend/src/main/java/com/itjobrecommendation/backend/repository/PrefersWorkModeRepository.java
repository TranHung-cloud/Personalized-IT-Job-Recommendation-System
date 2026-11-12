package com.itjobrecommendation.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.itjobrecommendation.backend.entity.PrefersWorkMode;
import com.itjobrecommendation.backend.entity.Profile;
import com.itjobrecommendation.backend.entity.id.PrefersWorkModeId;

public interface PrefersWorkModeRepository extends JpaRepository<PrefersWorkMode, PrefersWorkModeId> {
    void deleteByProfile(Profile profile);
}
