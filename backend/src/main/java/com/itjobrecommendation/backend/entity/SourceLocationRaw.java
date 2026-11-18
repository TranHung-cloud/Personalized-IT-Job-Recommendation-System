package com.itjobrecommendation.backend.entity;

import com.itjobrecommendation.backend.entity.id.SourceLocationRawId;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "source_location_raw")
@Getter
@Setter
@NoArgsConstructor
public class SourceLocationRaw {
    @EmbeddedId
    private SourceLocationRawId id;

    @MapsId("sourceId")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "src_id", nullable = false)
    private Source source;

    @MapsId("rawLocationName")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "loc_raw_name", nullable = false)
    private LocationRaw locationRaw;
}
