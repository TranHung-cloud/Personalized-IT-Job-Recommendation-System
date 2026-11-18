package com.itjobrecommendation.backend.repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import com.itjobrecommendation.backend.entity.Job;

public interface JobRepository extends JpaRepository<Job, UUID> {
    @EntityGraph(attributePaths = { "company", "position", "workMode", "qualification" })
    List<Job> findByExpiredAtGreaterThanEqual(OffsetDateTime expirationBoundary);
}
