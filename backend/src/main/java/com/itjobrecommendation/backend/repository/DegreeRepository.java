package com.itjobrecommendation.backend.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;

import com.itjobrecommendation.backend.entity.Degree;
import com.itjobrecommendation.backend.entity.Profile;

public interface DegreeRepository extends JpaRepository<Degree, UUID> {
    @EntityGraph(attributePaths = "qualification")
    List<Degree> findByProfile(Profile profile);
}
