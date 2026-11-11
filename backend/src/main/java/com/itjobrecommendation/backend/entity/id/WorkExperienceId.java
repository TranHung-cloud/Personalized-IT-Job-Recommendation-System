package com.itjobrecommendation.backend.entity.id;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.io.Serializable;
import java.util.UUID;

import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Embeddable
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class WorkExperienceId implements Serializable {
    @Column(name = "pf_id")
    private UUID profileId;
    @Column(name = "co_id")
    private UUID companyId;
    @Column(name = "pos_id")
    private UUID positionId;
    @Column(name = "month_start")
    private java.time.LocalDate monthStart;
}
