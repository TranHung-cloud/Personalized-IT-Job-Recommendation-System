package com.itjobrecommendation.backend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

import org.hibernate.annotations.UuidGenerator;

@Entity
@Table(name = "qualifications")
@Getter
@Setter
@NoArgsConstructor
public class Qualifications {
    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(name = "qual_id", columnDefinition = "uuid")
    private UUID id;
    @Column(name = "qual_name")
    private String name;
    @Column(name = "qual_level")
    private Integer level;
}
