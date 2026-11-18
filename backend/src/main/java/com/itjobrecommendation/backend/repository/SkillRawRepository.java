package com.itjobrecommendation.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import com.itjobrecommendation.backend.entity.SkillRaw;

public interface SkillRawRepository extends JpaRepository<SkillRaw, String>, JpaSpecificationExecutor<SkillRaw> {

}
