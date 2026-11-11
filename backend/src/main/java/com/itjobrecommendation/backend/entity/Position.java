package com.itjobrecommendation.backend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

import org.hibernate.annotations.UuidGenerator;

@Entity
@Table(name = "position")
@Getter
@Setter
@NoArgsConstructor
public class Position {
    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(name = "pos_id", columnDefinition = "uuid")
    private UUID id;
    @Column(name = "pos_name")
    private String name;
}
