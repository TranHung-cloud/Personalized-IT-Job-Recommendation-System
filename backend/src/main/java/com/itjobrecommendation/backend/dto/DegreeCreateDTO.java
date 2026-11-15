package com.itjobrecommendation.backend.dto;

import java.time.LocalDate;
import java.util.UUID;

import org.springframework.web.multipart.MultipartFile;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
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
public class DegreeCreateDTO {
    @NotBlank(message = "Chuyên ngành không được để trống")
    private String degMajor;
    @NotBlank(message = "Tên cơ sở đào tạo không được để trống")
    private String degInstitution;
    @NotBlank(message = "Tên người cấp bằng không được để trống")
    private String degSignedBy;
    @NotNull(message = "Hình ảnh bằng cấp không được để trống")
    private MultipartFile degImage;
    @NotNull(message = "Ngày cấp bằng không được để trống")
    private LocalDate degIssuedAt;
    @NotNull(message = "Học vị không được để trống")
    private UUID qualId;
    private UUID pfId;
}
