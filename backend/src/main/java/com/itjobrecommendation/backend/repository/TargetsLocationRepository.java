package com.itjobrecommendation.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.itjobrecommendation.backend.entity.Profile;
import com.itjobrecommendation.backend.entity.TargetsLocation;
import com.itjobrecommendation.backend.entity.id.TargetsLocationId;

public interface TargetsLocationRepository extends JpaRepository<TargetsLocation, TargetsLocationId> {
    void deleteByProfile(Profile profile);
}
