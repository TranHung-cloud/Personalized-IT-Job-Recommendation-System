package com.itjobrecommendation.backend.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;

import com.itjobrecommendation.backend.entity.Profile;
import com.itjobrecommendation.backend.entity.TargetsLocation;
import com.itjobrecommendation.backend.entity.id.TargetsLocationId;

public interface TargetsLocationRepository extends JpaRepository<TargetsLocation, TargetsLocationId> {
    void deleteByProfile(Profile profile);

    @EntityGraph(attributePaths = "location")
    List<TargetsLocation> findByProfile(Profile profile);
}
