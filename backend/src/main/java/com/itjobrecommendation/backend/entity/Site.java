package com.itjobrecommendation.backend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

import org.hibernate.annotations.UuidGenerator;

@Entity
@Table(name = "site")
@Getter
@Setter
@NoArgsConstructor
public class Site {
    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(name = "site_id", columnDefinition = "uuid")
    private UUID id;
    @Column(name = "site_name")
    private String name;
}
