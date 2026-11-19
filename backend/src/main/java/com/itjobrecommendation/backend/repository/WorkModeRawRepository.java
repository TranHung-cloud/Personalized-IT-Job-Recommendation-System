package com.itjobrecommendation.backend.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import com.itjobrecommendation.backend.entity.WorkModeRaw;

public interface WorkModeRawRepository
        extends JpaRepository<WorkModeRaw, String>, JpaSpecificationExecutor<WorkModeRaw> {
    Optional<WorkModeRaw> findByRawName(String rawName);
}
