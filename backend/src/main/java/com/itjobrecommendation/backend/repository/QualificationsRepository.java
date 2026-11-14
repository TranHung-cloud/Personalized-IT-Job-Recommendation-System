package com.itjobrecommendation.backend.repository;

import java.util.UUID;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.itjobrecommendation.backend.entity.Qualifications;

public interface QualificationsRepository extends JpaRepository<Qualifications, UUID> {
    List<Qualifications> findAllByOrderByLevelAscNameAsc();
}
