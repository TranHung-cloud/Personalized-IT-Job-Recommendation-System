package com.itjobrecommendation.backend.entity;

import com.itjobrecommendation.backend.entity.enums.RawValueStatus;

import jakarta.persistence.*;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.ManyToOne;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "position_raw")
@Getter
@Setter
@NoArgsConstructor
public class PositionRaw {
    @Id
    @Column(name = "pos_raw_name")
    private String rawName;
    @Column(name = "pos_raw_count")
    private Long rawCount;
    @Enumerated(EnumType.STRING)
    @Column(name = "pos_raw_status")
    private RawValueStatus status;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pos_id")
    private Position canonical;
}
