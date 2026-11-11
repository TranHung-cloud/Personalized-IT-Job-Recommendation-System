package com.itjobrecommendation.backend.dto;

import java.time.LocalDate;
import java.util.UUID;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.Getter;
import lombok.Setter;

@Data
@AllArgsConstructor
@Getter
@Setter
public class WorkExperienceCreateDTO {
    @NotNull(message = "Công ty không được để trống")
    private UUID coId;
    @NotNull(message = "Vị trí công việc không được để trống")
    private UUID posId;
    private UUID pfId;
    @NotNull(message = "Thời gian bắt đầu làm việc không được để trống")
    private LocalDate startAt;
    private LocalDate endAt;
}