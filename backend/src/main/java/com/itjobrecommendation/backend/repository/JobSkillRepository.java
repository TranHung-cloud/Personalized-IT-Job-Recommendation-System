package com.itjobrecommendation.backend.repository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import com.itjobrecommendation.backend.entity.Job;
import com.itjobrecommendation.backend.entity.JobSkill;
import com.itjobrecommendation.backend.entity.id.JobSkillId;

public interface JobSkillRepository extends JpaRepository<JobSkill, JobSkillId> {
    @EntityGraph(attributePaths = "skill")
    List<JobSkill> findByJob_IdIn(Collection<UUID> jobIds);

    @EntityGraph(attributePaths = "skill")
    List<JobSkill> getByJob(Job job);
}
