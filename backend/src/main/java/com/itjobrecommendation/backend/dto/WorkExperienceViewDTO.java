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
public class WorkExperienceViewDTO {
    private OptionViewDTO company;
    private OptionViewDTO position;
    private LocalDate startAt;
    private LocalDate endAt;
}
