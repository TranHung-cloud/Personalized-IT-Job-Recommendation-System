package com.itjobrecommendation.backend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record PasswordResetRequest(
        @NotBlank(message = "Email không được để trống")
        @Email(message = "Email không hợp lệ") String email) {
}
