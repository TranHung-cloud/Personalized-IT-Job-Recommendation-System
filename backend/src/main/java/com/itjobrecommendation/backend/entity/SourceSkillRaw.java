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
}
