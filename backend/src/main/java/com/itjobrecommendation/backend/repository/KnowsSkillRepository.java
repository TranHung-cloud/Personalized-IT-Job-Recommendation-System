package com.itjobrecommendation.backend.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;

import com.itjobrecommendation.backend.entity.KnowsSkill;
import com.itjobrecommendation.backend.entity.Profile;
import com.itjobrecommendation.backend.entity.id.KnowsSkillId;

public interface KnowsSkillRepository extends JpaRepository<KnowsSkill, KnowsSkillId> {
    void deleteByProfile(Profile profile);

    @EntityGraph(attributePaths = "skill")
    List<KnowsSkill> findByProfile(Profile profile);
}
