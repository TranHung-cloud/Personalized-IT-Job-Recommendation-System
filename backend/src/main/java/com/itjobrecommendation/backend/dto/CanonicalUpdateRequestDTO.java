package com.itjobrecommendation.backend.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Getter
@Setter
public class CanonicalUpdateRequestDTO {
    @NotBlank
    private String name;
    @NotBlank
    private String targetType;
}
