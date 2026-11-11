package com.itjobrecommendation.backend.entity;

import jakarta.persistence.*;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.ManyToOne;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.util.UUID;

import org.hibernate.annotations.UuidGenerator;

import com.itjobrecommendation.backend.entity.enums.*;

@Entity
@Table(name = "source")
@Getter
@Setter
@NoArgsConstructor
public class Source {
    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(name = "src_id", columnDefinition = "uuid")
    private UUID id;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "site_id")
    private Site site;
    @Column(name = "src_url")
    private String url;
    @Column(name = "src_crawled_at")
    private OffsetDateTime crawledAt;
    @Column(name = "src_created_at")
    private OffsetDateTime createdAt;
    @Column(name = "src_raw_key")
    private String rawKey;
    @Enumerated(EnumType.STRING)
    @Column(name = "src_status")
    private SourceStatus status;
    @Column(name = "pos_raw_name")
    private String positionRawName;
    @Column(name = "wm_raw_name")
    private String workModeRawName;
}
