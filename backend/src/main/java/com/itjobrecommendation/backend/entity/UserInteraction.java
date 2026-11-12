package com.itjobrecommendation.backend.entity;

import jakarta.persistence.*;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;

import com.itjobrecommendation.backend.entity.enums.*;
import com.itjobrecommendation.backend.entity.id.UserInteractionId;

@Entity
@Table(name = "user_interaction")
@Getter
@Setter
@NoArgsConstructor
public class UserInteraction {
    @EmbeddedId
    private UserInteractionId id;

    @MapsId("accountId")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "acc_id", nullable = false)
    private Account account;

    @MapsId("jobId")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "job_id", nullable = false)
    private Job job;

    @Enumerated(EnumType.STRING)
    @Column(name = "action")
    private UserInteractionAction action;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;
}
