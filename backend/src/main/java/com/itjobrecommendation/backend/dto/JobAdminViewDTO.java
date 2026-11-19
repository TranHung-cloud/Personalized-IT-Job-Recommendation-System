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
public class JobAdminViewDTO {
    private String jobId;
    private String title;
    private String companyName;
    private List<String> missingFields;
    private String site;
    private String interestCount;
    private String ignoreCount;
}
