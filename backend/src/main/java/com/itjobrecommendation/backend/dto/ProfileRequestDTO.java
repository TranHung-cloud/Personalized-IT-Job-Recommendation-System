package com.itjobrecommendation.backend.dto;

import java.util.List;
import java.util.UUID;

import jakarta.validation.constraints.Min;
import jakarta.validation.Valid;
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
public class ProfileRequestDTO {
    @Min(value = 0, message = "Mức lương kỳ vọng tối thiểu phải lớn hơn hoặc bằng 0")
    private Integer exptSalMin;
    private List<UUID> skillIds;
    private List<UUID> locIds;
    private List<UUID> wmIds;
    private List<UUID> posIds;
    private List<@Valid WorkExperienceCreateDTO> workExperiences;
    private List<@Valid DegreeCreateDTO> degrees;
}
