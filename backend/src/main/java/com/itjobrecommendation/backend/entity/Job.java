package com.itjobrecommendation.backend.entity;

import jakarta.persistence.*;
import jakarta.persistence.ManyToOne;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.util.UUID;

import org.hibernate.annotations.UuidGenerator;

@Entity
@Table(name = "job")
@Getter
@Setter
@NoArgsConstructor
public class Job {
    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(name = "job_id", columnDefinition = "uuid")
    private UUID id;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "co_id")
    private Company company;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "src_id")
    private Source source;
    @Column(name = "job_title")
    private String title;
    @Column(name = "job_title_norm")
    private String normalizedTitle;
    @Column(name = "job_exp_min")
    private Integer experienceMin;
    @Column(name = "job_exp_max")
    private Integer experienceMax;
    @Column(name = "job_sal_min")
    private Integer salaryMin;
    @Column(name = "job_sal_max")
    private Integer salaryMax;
    @Column(name = "job_sal_nego")
    private Boolean salaryNegotiable;
    @Column(name = "job_desc", columnDefinition = "text")
    private String description;
    @Column(name = "job_req", columnDefinition = "text")
    private String requirements;
    @Column(name = "job_benefit", columnDefinition = "text")
    private String benefits;
    @Column(name = "job_expired_at")
    private OffsetDateTime expiredAt;
    @Column(name = "job_posted_at")
    private OffsetDateTime postedAt;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pos_id")
    private Position position;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "wm_id")
    private WorkMode workMode;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "qual_id")
    private Qualifications qualification;
}
