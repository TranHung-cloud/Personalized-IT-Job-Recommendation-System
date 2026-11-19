package com.itjobrecommendation.backend.dto;

import com.itjobrecommendation.backend.entity.enums.UserInteractionAction;

import jakarta.validation.constraints.NotNull;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class MatchInteractionRequestDTO {
    @NotNull(message = "action là bắt buộc")
    private UserInteractionAction action;
}
