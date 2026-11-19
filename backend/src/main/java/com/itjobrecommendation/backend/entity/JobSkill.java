package com.itjobrecommendation.backend.entity;

import com.itjobrecommendation.backend.entity.id.JobSkillId;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "job_skill")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class JobSkill {
    @EmbeddedId
    private JobSkillId id;

    @MapsId("jobId")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "job_id", nullable = false)
    private Job job;

    @MapsId("skillId")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sk_id", nullable = false)
    private Skill skill;
}
