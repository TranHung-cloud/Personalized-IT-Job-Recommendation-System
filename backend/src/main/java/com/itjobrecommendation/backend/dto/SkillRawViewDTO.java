package com.itjobrecommendation.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.Getter;
import lombok.Setter;

@Data
@AllArgsConstructor
@Getter
@Setter
public class SkillRawViewDTO {
    private String rawName;
    private Long rawCount;
    private String status;
    private OptionViewDTO canonical;
}
