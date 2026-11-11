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
@Table(name = "location_raw")
@Getter
@Setter
@NoArgsConstructor
public class LocationRaw {
    @Id
    @Column(name = "loc_raw_name")
    private String rawName;
    @Column(name = "loc_raw_count")
    private Long rawCount;
    @Enumerated(EnumType.STRING)
    @Column(name = "loc_raw_status")
    private RawValueStatus status;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "loc_id")
    private Location canonical;
}
