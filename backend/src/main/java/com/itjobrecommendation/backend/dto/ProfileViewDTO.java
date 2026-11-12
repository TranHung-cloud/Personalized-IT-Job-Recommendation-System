package com.itjobrecommendation.backend.dto;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.Getter;
import lombok.Setter;

@Data
@AllArgsConstructor
@Getter
@Setter
public class ProfileViewDTO {
    private Integer exptSalMin;
    private List<OptionViewDTO> skill;
    private List<OptionViewDTO> loc;
    private List<OptionViewDTO> wm;
    private List<OptionViewDTO> pos;
    private List<WorkExperienceViewDTO> workExperiences;
    private List<DegreeViewDTO> degrees;
}
