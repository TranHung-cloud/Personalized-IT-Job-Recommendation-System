package com.itjobrecommendation.backend.dto;

import java.time.LocalDate;
import java.util.UUID;

import org.springframework.web.multipart.MultipartFile;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class DegreeUpdateDTO {
    private UUID id;

    @NotBlank(message = "Chuyên ngành không được để trống")
    private String degMajor;

    @NotBlank(message = "Tên cơ sở đào tạo không được để trống")
    private String degInstitution;

    @NotBlank(message = "Tên người cấp bằng không được để trống")
    private String degSignedBy;

    private MultipartFile degImage;

    @NotNull(message = "Ngày cấp bằng không được để trống")
    private LocalDate degIssuedAt;

    @NotNull(message = "Học vị không được để trống")
    private UUID qualId;
}
