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
}
