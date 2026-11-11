package com.itjobrecommendation.backend.entity;

import com.itjobrecommendation.backend.entity.id.TargetsPositionId;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "targets_position")
@Getter
@Setter
@NoArgsConstructor
public class TargetsPosition {
    @EmbeddedId
    private TargetsPositionId id;
}
