package com.itjobrecommendation.backend.dto;

import java.time.LocalDate;
import java.util.UUID;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Getter
@Setter
public class WorkExperienceCreateDTO {
    @NotBlank(message = "Công ty không được để trống")
    @Size(max = 255, message = "Tên công ty không được vượt quá 255 ký tự")
    private String companyName;
    @NotNull(message = "Vị trí công việc không được để trống")
    private UUID posId;
    private UUID pfId;
    @NotNull(message = "Thời gian bắt đầu làm việc không được để trống")
    private LocalDate startAt;
    private LocalDate endAt;
}
