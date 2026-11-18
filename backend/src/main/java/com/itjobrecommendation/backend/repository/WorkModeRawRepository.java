package com.itjobrecommendation.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import com.itjobrecommendation.backend.entity.WorkModeRaw;

public interface WorkModeRawRepository extends JpaRepository<WorkModeRaw, String>, JpaSpecificationExecutor<WorkModeRaw> {
}
