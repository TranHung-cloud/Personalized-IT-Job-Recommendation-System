package com.itjobrecommendation.backend.dto;

import java.util.UUID;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class QualificationViewDTO {
    private UUID id;
    private String name;
    private Integer level;
}
