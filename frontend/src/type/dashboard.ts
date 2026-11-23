export type DashboardRange = "7d" | "30d" | "90d" | "12m";

export type TimeSeriesPoint = {
  key: string;
  label: string;
  count: number;
};

export type CrawlerPerformancePoint = {
  key: string;
  label: string;
  total: number;
  crawled: number;
  error: number;
  pending: number;
  duplicate: number;
};

export type UserEngagementPoint = {
  key: string;
  label: string;
  total: number;
  interest: number;
  ignore: number;
};

export type DashboardStats = {
  range: DashboardRange;
  interval: "day" | "week" | "month";
  totalJobs: number;
  totalSources: number;
  totalAccounts: number;
  totalInteractions: number;
  jobPostingTrend: TimeSeriesPoint[];
  crawlerPerformance: CrawlerPerformancePoint[];
  userGrowth: TimeSeriesPoint[];
  userEngagement: UserEngagementPoint[];
};
