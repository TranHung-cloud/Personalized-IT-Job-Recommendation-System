package com.itjobrecommendation.backend.entity;

import com.itjobrecommendation.backend.entity.id.KnowsSkillId;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "knows_skill")
@Getter
@Setter
@NoArgsConstructor
public class KnowsSkill {
    @EmbeddedId
    private KnowsSkillId id;
}
