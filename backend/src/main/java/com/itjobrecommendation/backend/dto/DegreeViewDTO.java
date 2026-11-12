package com.itjobrecommendation.backend.dto;

import java.time.LocalDate;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.Getter;
import lombok.Setter;

@Data
@AllArgsConstructor
@Getter
@Setter
public class DegreeViewDTO {
    private String degMajor;
    private String degInstitution;
    private String degSignedBy;
    private String degImgPath;
    private LocalDate degIssuedAt;
    private OptionViewDTO qual;
}
