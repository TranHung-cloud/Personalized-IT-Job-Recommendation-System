package com.itjobrecommendation.backend.entity;

import jakarta.persistence.*;
import jakarta.persistence.ManyToOne;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.util.UUID;

import org.hibernate.annotations.UuidGenerator;

@Entity
@Table(name = "degrees")
@Getter
@Setter
@NoArgsConstructor
public class Degree {
    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(name = "deg_id", columnDefinition = "uuid")
    private UUID id;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pf_id")
    private Profile profile;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "qual_id")
    private Qualifications qualification;
    @Column(name = "deg_major")
    private String major;
    @Column(name = "deg_institution")
    private String institution;
    @Column(name = "deg_issued_at")
    private LocalDate issuedAt;
    @Column(name = "deg_signed_by")
    private String signedBy;
    @Column(name = "deg_path_img")
    private String imagePath;
}
