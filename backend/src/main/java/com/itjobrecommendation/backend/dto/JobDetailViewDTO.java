package com.itjobrecommendation.backend.dto;

import java.time.LocalDate;
import java.util.List;

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
public class JobDetailViewDTO {
    private String title;
    private String companyName;
    private String companyLogo;
    private String salary;
    private String experience;
    private String description;
    private String requirements;
    private String benefits;
    private List<String> location;
    private String workMode;
    private List<String> skills;
    private String position;
    private String qualification;
    private LocalDate postedAt;
    private LocalDate expiredAt;
    private String jobUrl;
}
