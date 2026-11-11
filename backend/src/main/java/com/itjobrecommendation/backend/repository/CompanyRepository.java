package com.itjobrecommendation.backend.repository;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.itjobrecommendation.backend.entity.Company;

public interface CompanyRepository extends JpaRepository<Company, UUID> {
    // Add any custom query methods if needed

}
