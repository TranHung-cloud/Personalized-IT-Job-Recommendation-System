package com.itjobrecommendation.backend.entity;

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
    @Column(name = "month_end")
    private java.time.LocalDate monthEnd;
}
