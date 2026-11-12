package com.itjobrecommendation.backend.entity;

import com.itjobrecommendation.backend.entity.id.TargetsPositionId;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "targets_position")
@Getter
@Setter
@NoArgsConstructor
public class TargetsPosition {
    @EmbeddedId
    private TargetsPositionId id;

    @MapsId("profileId")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pf_id", nullable = false)
    private Profile profile;

    @MapsId("positionId")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pos_id", nullable = false)
    private Position position;
}
