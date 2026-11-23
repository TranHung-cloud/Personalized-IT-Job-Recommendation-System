package com.itjobrecommendation.backend.dto;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.Getter;
import lombok.Setter;

@Data
@AllArgsConstructor
@Getter
@Setter
public class MatchingViewDTO {
    private String jobId;
    private UUID companyId;
    private String companyName;
    private String jobTitle;
    private Integer matchScore;
    private String location;
    private String workMode;
    private String salary;
    private String experience;
    private List<String> match;
    private List<String> unmatch;
    private LocalDate jobExpDate;
}
