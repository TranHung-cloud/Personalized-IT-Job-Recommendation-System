package com.itjobrecommendation.backend.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import com.itjobrecommendation.backend.entity.WorkExperience;
import com.itjobrecommendation.backend.entity.id.WorkExperienceId;

public interface WorkExperienceRepository extends JpaRepository<WorkExperience, WorkExperienceId> {
    @EntityGraph(attributePaths = { "company", "position" })
    List<WorkExperience> findByIdProfileId(UUID profileId);
}
