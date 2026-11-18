package com.itjobrecommendation.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class PositionRawViewDTO {
    private String rawName;
    private Long rawCount;
    private String status;
    private OptionViewDTO canonical;
}
