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

    @MapsId("profileId")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pf_id", nullable = false)
    private Profile profile;

    @MapsId("skillId")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sk_id", nullable = false)
    private Skill skill;
}
