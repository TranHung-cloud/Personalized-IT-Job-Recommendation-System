package com.itjobrecommendation.backend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

import org.hibernate.annotations.UuidGenerator;

@Entity
@Table(name = "location")
@Getter
@Setter
@NoArgsConstructor
public class Location {
    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(name = "loc_id", columnDefinition = "uuid")
    private UUID id;
    @Column(name = "loc_name")
    private String name;
}
