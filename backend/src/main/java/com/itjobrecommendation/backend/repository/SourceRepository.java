package com.itjobrecommendation.backend.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.itjobrecommendation.backend.entity.PositionRaw;
import com.itjobrecommendation.backend.entity.Source;
import com.itjobrecommendation.backend.entity.WorkModeRaw;

public interface SourceRepository extends JpaRepository<Source, UUID> {
    List<Source> findByPositionRaw(PositionRaw positionRaw);

    List<Source> findByWorkModeRaw(WorkModeRaw workModeRaw);
}
