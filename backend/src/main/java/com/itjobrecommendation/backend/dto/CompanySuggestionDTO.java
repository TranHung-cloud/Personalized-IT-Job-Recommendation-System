package com.itjobrecommendation.backend.dto;

import java.util.UUID;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class CompanySuggestionDTO {
    private UUID id;
    private String name;
    private String domain;
}
