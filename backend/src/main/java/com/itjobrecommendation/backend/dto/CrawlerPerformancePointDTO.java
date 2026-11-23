package com.itjobrecommendation.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class CrawlerPerformancePointDTO {
    private String key;
    private String label;
    private long total;
    private long crawled;
    private long error;
    private long pending;
    private long duplicate;
}
