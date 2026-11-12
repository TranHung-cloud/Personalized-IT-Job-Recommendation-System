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
@Table(name = "account")
@Getter
@Setter
@NoArgsConstructor
public class Account {
    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(name = "acc_id", columnDefinition = "uuid")
    private UUID id;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "role_id")
    private Role role;
    @Column(name = "acc_email")
    private String email;
    @Column(name = "acc_password_hash")
    private String passwordHash;
    @Column(name = "acc_enabled")
    private Boolean enabled;
    @Column(name = "acc_created_at")
    private OffsetDateTime createdAt;
    @Column(name = "acc_deleted_at")
    private OffsetDateTime deletedAt;
}
