package com.itjobrecommendation.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import com.itjobrecommendation.backend.entity.LocationRaw;

public interface LocationRawRepository extends JpaRepository<LocationRaw, String>, JpaSpecificationExecutor<LocationRaw> {
}
