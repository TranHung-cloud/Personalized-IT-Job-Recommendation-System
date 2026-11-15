package com.itjobrecommendation.backend.dto;

import java.time.LocalDate;
import java.util.UUID;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.Getter;
import lombok.Setter;

@Data
@AllArgsConstructor
@Getter
@Setter
public class DegreeViewDTO {
    private UUID id;
    private String degMajor;
    private String degInstitution;
    private String degSignedBy;
    private String degImgPath;
    private LocalDate degIssuedAt;
    private OptionViewDTO qual;
}
