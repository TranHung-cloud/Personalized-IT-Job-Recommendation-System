package com.itjobrecommendation.backend.entity;

import com.itjobrecommendation.backend.entity.id.PrefersWorkModeId;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "prefers_work_mode")
@Getter
@Setter
@NoArgsConstructor
public class PrefersWorkMode {
    @EmbeddedId
    private PrefersWorkModeId id;

    @MapsId("profileId")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pf_id", nullable = false)
    private Profile profile;

    @MapsId("workModeId")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "wm_id", nullable = false)
    private WorkMode workMode;
}
