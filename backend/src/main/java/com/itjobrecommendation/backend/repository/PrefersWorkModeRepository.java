package com.itjobrecommendation.backend.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;

import com.itjobrecommendation.backend.entity.PrefersWorkMode;
import com.itjobrecommendation.backend.entity.Profile;
import com.itjobrecommendation.backend.entity.id.PrefersWorkModeId;

public interface PrefersWorkModeRepository extends JpaRepository<PrefersWorkMode, PrefersWorkModeId> {
    void deleteByProfile(Profile profile);

    @EntityGraph(attributePaths = "workMode")
    List<PrefersWorkMode> findByProfile(Profile profile);
}
