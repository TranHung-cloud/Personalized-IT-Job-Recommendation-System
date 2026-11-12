package com.itjobrecommendation.backend.entity;

import com.itjobrecommendation.backend.entity.id.TargetsLocationId;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "targets_location")
@Getter
@Setter
@NoArgsConstructor
public class TargetsLocation {
    @EmbeddedId
    private TargetsLocationId id;

    @MapsId("profileId")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pf_id", nullable = false)
    private Profile profile;

    @MapsId("locationId")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "loc_id", nullable = false)
    private Location location;
}
