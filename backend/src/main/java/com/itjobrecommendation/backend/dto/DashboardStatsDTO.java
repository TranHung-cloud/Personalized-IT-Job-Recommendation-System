package com.itjobrecommendation.backend.dto;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class DashboardStatsDTO {
    private String range;
    private String interval;

    private long totalJobs;
    private long totalSources;
    private long totalAccounts;
    private long totalInteractions;

    private List<TimeSeriesPointDTO> jobPostingTrend;
    private List<CrawlerPerformancePointDTO> crawlerPerformance;
    private List<TimeSeriesPointDTO> userGrowth;
    private List<UserEngagementPointDTO> userEngagement;
}
