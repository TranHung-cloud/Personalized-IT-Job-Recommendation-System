package com.itjobrecommendation.backend.entity;

import com.itjobrecommendation.backend.entity.id.JobSkillId;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "job_skill")
@Getter
@Setter
@NoArgsConstructor
public class JobSkill {
    @EmbeddedId
    private JobSkillId id;
}
