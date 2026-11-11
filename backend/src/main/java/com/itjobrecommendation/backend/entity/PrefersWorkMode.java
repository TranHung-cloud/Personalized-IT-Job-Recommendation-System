package com.itjobrecommendation.backend.entity;

import com.itjobrecommendation.backend.entity.id.PrefersWorkModeId;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "prefers_work_mode")
@Getter
@Setter
@NoArgsConstructor
public class PrefersWorkMode {
    @EmbeddedId
    private PrefersWorkModeId id;
}
