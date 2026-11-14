package com.itjobrecommendation.backend.repository;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.itjobrecommendation.backend.entity.WorkMode;

public interface WorkModeRepository extends JpaRepository<WorkMode, UUID> {
}
