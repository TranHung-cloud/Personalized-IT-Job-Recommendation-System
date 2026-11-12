package com.itjobrecommendation.backend.entity;

import com.itjobrecommendation.backend.entity.id.JobLocationId;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "job_location")
@Getter
@Setter
@NoArgsConstructor
public class JobLocation {
    @EmbeddedId
    private JobLocationId id;

    @MapsId("jobId")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "job_id", nullable = false)
    private Job job;

    @MapsId("locationId")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "loc_id", nullable = false)
    private Location location;
}
