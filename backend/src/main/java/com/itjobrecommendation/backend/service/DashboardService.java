package com.itjobrecommendation.backend.service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.YearMonth;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.itjobrecommendation.backend.dto.CrawlerPerformancePointDTO;
import com.itjobrecommendation.backend.dto.DashboardStatsDTO;
import com.itjobrecommendation.backend.dto.TimeSeriesPointDTO;
import com.itjobrecommendation.backend.dto.UserEngagementPointDTO;
import com.itjobrecommendation.backend.entity.enums.SourceStatus;
import com.itjobrecommendation.backend.entity.enums.UserInteractionAction;

import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final EntityManager em;
    private static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final DateTimeFormatter DAY_LABEL_FORMAT = DateTimeFormatter.ofPattern("dd/MM");
    private static final DateTimeFormatter MONTH_LABEL_FORMAT = DateTimeFormatter.ofPattern("MM/yyyy");

    @Transactional(readOnly = true)
    public DashboardStatsDTO getDashboardStats(String rangeParam) {
        String range = normalizeRange(rangeParam);
        LocalDate today = LocalDate.now(ZONE);

        OffsetDateTime startTime;
        String interval;

        // Initialize Buckets
        Map<String, BucketMeta> bucketMetaMap = new LinkedHashMap<>();

        if ("7d".equals(range)) {
            interval = "day";
            startTime = today.minusDays(6).atStartOfDay(ZONE).toOffsetDateTime();
            for (int i = 6; i >= 0; i--) {
                LocalDate date = today.minusDays(i);
                String key = date.toString();
                String label = date.format(DAY_LABEL_FORMAT);
                bucketMetaMap.put(key, new BucketMeta(key, label));
            }
        } else if ("30d".equals(range)) {
            interval = "day";
            startTime = today.minusDays(29).atStartOfDay(ZONE).toOffsetDateTime();
            for (int i = 29; i >= 0; i--) {
                LocalDate date = today.minusDays(i);
                String key = date.toString();
                String label = date.format(DAY_LABEL_FORMAT);
                bucketMetaMap.put(key, new BucketMeta(key, label));
            }
        } else if ("90d".equals(range)) {
            interval = "week";
            LocalDate mondayThisWeek = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
            startTime = mondayThisWeek.minusWeeks(12).atStartOfDay(ZONE).toOffsetDateTime();
            for (int i = 12; i >= 0; i--) {
                LocalDate weekMonday = mondayThisWeek.minusWeeks(i);
                String key = weekMonday.toString();
                String label = weekMonday.format(DAY_LABEL_FORMAT);
                bucketMetaMap.put(key, new BucketMeta(key, label));
            }
        } else { // "12m"
            interval = "month";
            YearMonth currentMonth = YearMonth.from(today);
            startTime = currentMonth.minusMonths(11).atDay(1).atStartOfDay(ZONE).toOffsetDateTime();
            for (int i = 11; i >= 0; i--) {
                YearMonth ym = currentMonth.minusMonths(i);
                String key = ym.toString();
                String label = ym.format(MONTH_LABEL_FORMAT);
                bucketMetaMap.put(key, new BucketMeta(key, label));
            }
        }

        // Summary Totals
        long totalJobs = em.createQuery("SELECT COUNT(j) FROM Job j", Long.class).getSingleResult();
        long totalSources = em.createQuery("SELECT COUNT(s) FROM Source s", Long.class).getSingleResult();
        long totalAccounts = em.createQuery("SELECT COUNT(a) FROM Account a WHERE a.deletedAt IS NULL", Long.class)
                .getSingleResult();
        long totalInteractions = em.createQuery("SELECT COUNT(ui) FROM UserInteraction ui", Long.class)
                .getSingleResult();

        // 1. Job Posting Trend
        Map<String, Long> jobTrendCounts = new LinkedHashMap<>();
        for (String k : bucketMetaMap.keySet()) {
            jobTrendCounts.put(k, 0L);
        }
        List<OffsetDateTime> jobTimestamps = em.createQuery(
                "SELECT j.postedAt FROM Job j WHERE j.postedAt >= :startTime AND j.postedAt IS NOT NULL",
                OffsetDateTime.class)
                .setParameter("startTime", startTime)
                .getResultList();

        for (OffsetDateTime ts : jobTimestamps) {
            String key = toBucketKey(ts, interval);
            if (jobTrendCounts.containsKey(key)) {
                jobTrendCounts.put(key, jobTrendCounts.get(key) + 1);
            }
        }

        List<TimeSeriesPointDTO> jobPostingTrend = new ArrayList<>();
        for (Map.Entry<String, Long> entry : jobTrendCounts.entrySet()) {
            BucketMeta meta = bucketMetaMap.get(entry.getKey());
            jobPostingTrend.add(TimeSeriesPointDTO.builder()
                    .key(entry.getKey())
                    .label(meta.label)
                    .count(entry.getValue())
                    .build());
        }

        // 2. Crawler Performance
        Map<String, CrawlerPerformancePointDTO> crawlerMap = new LinkedHashMap<>();
        for (Map.Entry<String, BucketMeta> entry : bucketMetaMap.entrySet()) {
            crawlerMap.put(entry.getKey(), CrawlerPerformancePointDTO.builder()
                    .key(entry.getKey())
                    .label(entry.getValue().label)
                    .total(0)
                    .crawled(0)
                    .error(0)
                    .pending(0)
                    .duplicate(0)
                    .build());
        }

        List<Object[]> sourceRows = em.createQuery(
                "SELECT s.crawledAt, s.status FROM Source s WHERE s.crawledAt >= :startTime AND s.crawledAt IS NOT NULL",
                Object[].class)
                .setParameter("startTime", startTime)
                .getResultList();

        for (Object[] row : sourceRows) {
            OffsetDateTime ts = (OffsetDateTime) row[0];
            SourceStatus status = (SourceStatus) row[1];
            String key = toBucketKey(ts, interval);
            CrawlerPerformancePointDTO point = crawlerMap.get(key);
            if (point != null) {
                point.setTotal(point.getTotal() + 1);
                if (status == SourceStatus.crawled) {
                    point.setCrawled(point.getCrawled() + 1);
                } else if (status == SourceStatus.error) {
                    point.setError(point.getError() + 1);
                } else if (status == SourceStatus.pending) {
                    point.setPending(point.getPending() + 1);
                } else if (status == SourceStatus.duplicate) {
                    point.setDuplicate(point.getDuplicate() + 1);
                }
            }
        }
        List<CrawlerPerformancePointDTO> crawlerPerformance = new ArrayList<>(crawlerMap.values());

        // 3. User Growth
        Map<String, Long> userGrowthCounts = new LinkedHashMap<>();
        for (String k : bucketMetaMap.keySet()) {
            userGrowthCounts.put(k, 0L);
        }
        List<OffsetDateTime> accountTimestamps = em.createQuery(
                "SELECT a.createdAt FROM Account a WHERE a.createdAt >= :startTime AND a.createdAt IS NOT NULL",
                OffsetDateTime.class)
                .setParameter("startTime", startTime)
                .getResultList();

        for (OffsetDateTime ts : accountTimestamps) {
            String key = toBucketKey(ts, interval);
            if (userGrowthCounts.containsKey(key)) {
                userGrowthCounts.put(key, userGrowthCounts.get(key) + 1);
            }
        }

        List<TimeSeriesPointDTO> userGrowth = new ArrayList<>();
        for (Map.Entry<String, Long> entry : userGrowthCounts.entrySet()) {
            BucketMeta meta = bucketMetaMap.get(entry.getKey());
            userGrowth.add(TimeSeriesPointDTO.builder()
                    .key(entry.getKey())
                    .label(meta.label)
                    .count(entry.getValue())
                    .build());
        }

        // 4. User Engagement
        Map<String, UserEngagementPointDTO> engagementMap = new LinkedHashMap<>();
        for (Map.Entry<String, BucketMeta> entry : bucketMetaMap.entrySet()) {
            engagementMap.put(entry.getKey(), UserEngagementPointDTO.builder()
                    .key(entry.getKey())
                    .label(entry.getValue().label)
                    .total(0)
                    .interest(0)
                    .ignore(0)
                    .build());
        }

        List<Object[]> interactionRows = em.createQuery(
                "SELECT ui.createdAt, ui.action FROM UserInteraction ui WHERE ui.createdAt >= :startTime AND ui.createdAt IS NOT NULL",
                Object[].class)
                .setParameter("startTime", startTime)
                .getResultList();

        for (Object[] row : interactionRows) {
            OffsetDateTime ts = (OffsetDateTime) row[0];
            UserInteractionAction action = (UserInteractionAction) row[1];
            String key = toBucketKey(ts, interval);
            UserEngagementPointDTO point = engagementMap.get(key);
            if (point != null) {
                point.setTotal(point.getTotal() + 1);
                if (action == UserInteractionAction.interest) {
                    point.setInterest(point.getInterest() + 1);
                } else if (action == UserInteractionAction.ignore) {
                    point.setIgnore(point.getIgnore() + 1);
                }
            }
        }
        List<UserEngagementPointDTO> userEngagement = new ArrayList<>(engagementMap.values());

        return DashboardStatsDTO.builder()
                .range(range)
                .interval(interval)
                .totalJobs(totalJobs)
                .totalSources(totalSources)
                .totalAccounts(totalAccounts)
                .totalInteractions(totalInteractions)
                .jobPostingTrend(jobPostingTrend)
                .crawlerPerformance(crawlerPerformance)
                .userGrowth(userGrowth)
                .userEngagement(userEngagement)
                .build();
    }

    private String toBucketKey(OffsetDateTime ts, String interval) {
        LocalDate localDate = ts.atZoneSameInstant(ZONE).toLocalDate();
        if ("day".equals(interval)) {
            return localDate.toString();
        } else if ("week".equals(interval)) {
            return localDate.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)).toString();
        } else {
            return YearMonth.from(localDate).toString();
        }
    }

    private String normalizeRange(String range) {
        if (range == null) return "30d";
        String lower = range.trim().toLowerCase();
        return switch (lower) {
            case "7d", "7days", "week" -> "7d";
            case "90d", "90days", "quarter" -> "90d";
            case "12m", "1y", "year" -> "12m";
            default -> "30d";
        };
    }

    private static class BucketMeta {
        final String key;
        final String label;

        BucketMeta(String key, String label) {
            this.key = key;
            this.label = label;
        }
    }
}
