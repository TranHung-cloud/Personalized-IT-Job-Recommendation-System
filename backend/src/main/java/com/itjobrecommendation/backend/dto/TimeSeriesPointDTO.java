package com.itjobrecommendation.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class TimeSeriesPointDTO {
    private String key;
    private String label;
    private long count;
}
