package com.itjobrecommendation.backend.entity;

import jakarta.persistence.*;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

import org.hibernate.annotations.UuidGenerator;

@Entity
@Table(name = "profile")
@Getter
@Setter
@NoArgsConstructor
public class Profile {
    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(name = "pf_id", columnDefinition = "uuid")
    private UUID id;
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "acc_id")
    private Account account;
    @Column(name = "pf_expt_sal_min")
    private Integer expectedSalaryMin;
}
