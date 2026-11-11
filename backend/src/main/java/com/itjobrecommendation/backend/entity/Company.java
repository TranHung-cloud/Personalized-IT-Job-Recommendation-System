package com.itjobrecommendation.backend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

import org.hibernate.annotations.UuidGenerator;

@Entity
@Table(name = "company")
@Getter
@Setter
@NoArgsConstructor
public class Company {
    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(name = "co_id", columnDefinition = "uuid")
    private UUID id;
    @Column(name = "co_name")
    private String name;
    @Column(name = "co_name_norm")
    private String normalizedName;
}
