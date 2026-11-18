package com.itjobrecommendation.backend.repository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import com.itjobrecommendation.backend.entity.JobLocation;
import com.itjobrecommendation.backend.entity.id.JobLocationId;

public interface JobLocationRepository extends JpaRepository<JobLocation, JobLocationId> {
    @EntityGraph(attributePaths = "location")
    List<JobLocation> findByJob_IdIn(Collection<UUID> jobIds);
}
