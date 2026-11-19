package com.itjobrecommendation.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UndoInteractionResponseDTO {
    private boolean jobStillEligible;
}
