package com.itjobrecommendation.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.itjobrecommendation.backend.entity.KnowsSkill;
import com.itjobrecommendation.backend.entity.Profile;
import com.itjobrecommendation.backend.entity.id.KnowsSkillId;

public interface KnowsSkillRepository extends JpaRepository<KnowsSkill, KnowsSkillId> {
    void deleteByProfile(Profile profile);
}
