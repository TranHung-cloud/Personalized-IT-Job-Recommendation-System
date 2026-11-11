package com.itjobrecommendation.backend.repository;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.itjobrecommendation.backend.entity.Qualifications;

public interface QualificationsRepository extends JpaRepository<Qualifications, UUID> {

}
