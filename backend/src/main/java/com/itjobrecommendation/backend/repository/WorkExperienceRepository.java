package com.itjobrecommendation.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.itjobrecommendation.backend.entity.WorkExperience;
import com.itjobrecommendation.backend.entity.id.WorkExperienceId;

public interface WorkExperienceRepository extends JpaRepository<WorkExperience, WorkExperienceId> {
    // Add any custom query methods if needed

}
