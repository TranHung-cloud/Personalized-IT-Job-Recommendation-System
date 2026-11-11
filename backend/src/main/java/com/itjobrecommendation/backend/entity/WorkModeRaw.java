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
@Table(name = "work_mode_raw")
@Getter
@Setter
@NoArgsConstructor
public class WorkModeRaw {
    @Id
    @Column(name = "wm_raw_name")
    private String rawName;
    @Column(name = "wm_raw_count")
    private Long rawCount;
    @Enumerated(EnumType.STRING)
    @Column(name = "wm_raw_status")
    private RawValueStatus status;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "wm_id")
    private WorkMode canonical;
}
