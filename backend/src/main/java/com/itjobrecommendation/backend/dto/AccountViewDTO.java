package com.itjobrecommendation.backend.dto;

import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.Getter;
import lombok.Setter;

@Data
@AllArgsConstructor
@Getter
@Setter
public class AccountViewDTO {
    private String email;
    private String role;
    private LocalDateTime createdAt;
}
