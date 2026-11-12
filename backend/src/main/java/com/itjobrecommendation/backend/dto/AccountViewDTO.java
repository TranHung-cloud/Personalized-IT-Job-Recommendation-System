package com.itjobrecommendation.backend.dto;

import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Getter
@Setter
public class AccountViewDTO {
    private String email;
    private String role;
    private LocalDateTime createdAt;
    private Integer interestedJobCount;
    private Integer ignoredJobCount;
}
