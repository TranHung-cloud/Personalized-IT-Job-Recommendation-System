package com.itjobrecommendation.backend.entity;

import com.itjobrecommendation.backend.entity.enums.*;

import jakarta.persistence.*;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.ManyToOne;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "skill_raw")
@Getter
@Setter
@NoArgsConstructor
public class SkillRaw {
    @Id
    @Column(name = "sk_raw_name")
    private String rawName;
    @Column(name = "sk_raw_count")
    private Long rawCount;
    @Enumerated(EnumType.STRING)
    @Column(name = "sk_raw_status")
    private RawValueStatus status;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sk_id")
    private Skill canonical;
}
