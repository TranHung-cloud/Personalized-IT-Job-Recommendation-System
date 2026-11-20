package com.itjobrecommendation.backend.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.itjobrecommendation.backend.entity.SourceSkillRaw;
import com.itjobrecommendation.backend.entity.id.SourceSkillRawId;

public interface SourceSkillRawRepository extends JpaRepository<SourceSkillRaw, SourceSkillRawId> {
    List<SourceSkillRaw> findSourceBySkillRawRawName(String rawName);

}
