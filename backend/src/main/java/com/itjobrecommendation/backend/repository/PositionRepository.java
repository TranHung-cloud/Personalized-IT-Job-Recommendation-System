package com.itjobrecommendation.backend.repository;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.itjobrecommendation.backend.entity.Position;

public interface PositionRepository extends JpaRepository<Position, UUID> {
    // Add any custom query methods if needed

}
