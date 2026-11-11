package com.itjobrecommendation.backend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

import org.hibernate.annotations.UuidGenerator;

@Entity
@Table(name = "skill")
@Getter
@Setter
@NoArgsConstructor
public class Skill {
    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(name = "sk_id", columnDefinition = "uuid")
    private UUID id;
    @Column(name = "sk_name")
    private String name;
}
