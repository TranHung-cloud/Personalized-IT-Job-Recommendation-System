package com.itjobrecommendation.backend.dto;

import jakarta.validation.constraints.NotBlank;

public record EmailVerificationRequest(@NotBlank String token) {
}
