package com.itjobrecommendation.backend.entity;

import com.itjobrecommendation.backend.entity.id.SourceSkillRawId;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "source_skill_raw")
@Getter
@Setter
@NoArgsConstructor
public class SourceSkillRaw {
    @EmbeddedId
    private SourceSkillRawId id;

    @MapsId("sourceId")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "source_id", nullable = false)
    private Source source;

    @MapsId("rawSkillName")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sk_raw_name", nullable = false)
    private Skill skill;
}
