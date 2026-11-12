package com.itjobrecommendation.backend.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;

import com.itjobrecommendation.backend.entity.Profile;
import com.itjobrecommendation.backend.entity.TargetsPosition;
import com.itjobrecommendation.backend.entity.id.TargetsPositionId;

public interface TargetsPositionRepository extends JpaRepository<TargetsPosition, TargetsPositionId> {
    void deleteByProfile(Profile profile);

    @EntityGraph(attributePaths = "position")
    List<TargetsPosition> findByProfile(Profile profile);
}
