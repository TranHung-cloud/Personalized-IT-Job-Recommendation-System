package com.itjobrecommendation.backend.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import com.itjobrecommendation.backend.entity.PositionRaw;

public interface PositionRawRepository
        extends JpaRepository<PositionRaw, String>, JpaSpecificationExecutor<PositionRaw> {
    Optional<PositionRaw> findByRawName(String rawName);
}
