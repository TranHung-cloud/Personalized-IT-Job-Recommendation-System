package com.itjobrecommendation.backend.entity;

import java.time.LocalDate;

import com.itjobrecommendation.backend.entity.id.WorkExperienceId;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "work_experience")
@Getter
@Setter
@NoArgsConstructor
public class WorkExperience {
    @EmbeddedId
    private WorkExperienceId id;

    @MapsId("companyId")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "co_id", nullable = false)
    private Company company;

    @MapsId("positionId")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pos_id", nullable = false)
    private Position position;

    @Column(name = "month_end")
    private LocalDate monthEnd;
}
