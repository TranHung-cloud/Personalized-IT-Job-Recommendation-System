package com.itjobrecommendation.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.itjobrecommendation.backend.entity.TargetsPosition;
import com.itjobrecommendation.backend.entity.id.TargetsPositionId;

public interface TargetsPositionRepository extends JpaRepository<TargetsPosition, TargetsPositionId> {

}
