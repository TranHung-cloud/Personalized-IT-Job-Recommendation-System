package com.itjobrecommendation.backend.dto;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Getter
@Setter
public class JobInterestViewDTO {
    private UUID id;
    private String title;
    private String companyName;
    private String companyLogo;
    private String salary;
    private String experience;
    private String workMode;
    private List<String> location;
    private LocalDate expiredAt;
    private String jobUrl;
}
