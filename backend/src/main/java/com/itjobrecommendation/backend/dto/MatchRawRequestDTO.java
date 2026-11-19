package com.itjobrecommendation.backend.dto;

import java.util.UUID;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.Getter;
import lombok.Setter;

@Data
@AllArgsConstructor
@Getter
@Setter
public class MatchRawRequestDTO {
    private String rawName;
    private UUID canonicalId;
}
