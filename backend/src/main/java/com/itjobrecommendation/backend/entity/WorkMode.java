package com.itjobrecommendation.backend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

import org.hibernate.annotations.UuidGenerator;

@Entity
@Table(name = "work_mode")
@Getter
@Setter
@NoArgsConstructor
public class WorkMode {
    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(name = "wm_id", columnDefinition = "uuid")
    private UUID id;
    @Column(name = "wm_name")
    private String name;
}
