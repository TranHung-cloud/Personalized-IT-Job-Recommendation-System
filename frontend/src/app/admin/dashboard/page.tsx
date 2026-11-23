"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import {
  BriefcaseBusiness,
  Bot,
  UsersRound,
  HeartHandshake,
  TrendingUp,
  LoaderCircle,
  AlertCircle,
  Calendar,
} from "lucide-react";
import { authenticatedRequest } from "@/lib/authenticatedRequest";
import type { DashboardRange, DashboardStats } from "@/type/dashboard";

const TIME_RANGES: { id: DashboardRange; label: string }[] = [
  { id: "7d", label: "7 ngày qua" },
  { id: "30d", label: "30 ngày qua" },
  { id: "90d", label: "90 ngày qua" },
  { id: "12m", label: "12 tháng qua" },
];

export default function AdminDashboardPage() {
  const router = useRouter();
  const [range, setRange] = useState<DashboardRange>("30d");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(
    async (selectedRange: DashboardRange) => {
      const token = window.localStorage.getItem("accessToken");
      if (!token) {
        router.replace("/login");
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const data = await authenticatedRequest<DashboardStats>(
          `/api/admin/dashboard/stats?range=${selectedRange}`,
          token,
          { fallbackMessage: "Không thể tải số liệu thống kê." },
        );
        setStats(data);
      } catch (cause) {
        if (cause instanceof Error && cause.message === "SESSION_EXPIRED") {
          window.localStorage.removeItem("accessToken");
          window.localStorage.removeItem("accountRole");
          window.localStorage.removeItem("accountEmail");
          router.replace("/login");
          return;
        }
        setError(
          cause instanceof Error
            ? cause.message
            : "Đã xảy ra lỗi khi tải số liệu thống kê.",
        );
      } finally {
        setLoading(false);
      }
    },
    [router],
  );

  useEffect(() => {
    void loadStats(range);
  }, [range, loadStats]);

  // Dynamic X-Axis tick interval based on range and point count
  const getXAxisInterval = (pointCount: number): number => {
    if (range === "7d") return 0; // Show all 7 days
    if (range === "12m") return 0; // Show all 12 months
    if (range === "30d") return Math.ceil(pointCount / 10); // Show ~8-10 ticks
    if (range === "90d") return Math.ceil(pointCount / 7); // Show ~6-7 ticks
    return 0;
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Top Header & Range Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#0F172A] sm:text-2xl">
            Tổng quan hệ thống
          </h1>
          <p className="mt-1 text-sm text-[#64748B]">
            Thống kê xu hướng việc làm, hiệu suất thu thập dữ liệu và mức độ tương tác người dùng.
          </p>
        </div>

        {/* Time Range Filter (Top-Right Corner) */}
        <div className="flex items-center gap-1.5 rounded-xl border border-[#CBD5E1] bg-white p-1 shadow-sm shrink-0 self-start sm:self-auto">
          <Calendar size={15} className="ml-2 mr-1 text-[#94A3B8]" />
          {TIME_RANGES.map((r) => {
            const isActive = range === r.id;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => setRange(r.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  isActive
                    ? "bg-[#2563EB] text-white shadow-sm"
                    : "text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A]"
                }`}
              >
                {r.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle size={18} className="shrink-0" />
          <p className="font-medium">{error}</p>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1 */}
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
              Tổng việc làm
            </span>
            <div className="flex size-9 items-center justify-center rounded-xl bg-blue-50 text-[#2563EB]">
              <BriefcaseBusiness size={18} />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold tracking-tight text-[#0F172A]">
            {loading ? "…" : (stats?.totalJobs?.toLocaleString("vi-VN") ?? "0")}
          </p>
          <p className="mt-1 flex items-center gap-1 text-xs text-[#64748B]">
            <TrendingUp size={13} className="text-emerald-600" />
            Số tin tuyển dụng lưu trữ
          </p>
        </div>

        {/* Card 2 */}
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
              Nguồn thu thập
            </span>
            <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <Bot size={18} />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold tracking-tight text-[#0F172A]">
            {loading ? "…" : (stats?.totalSources?.toLocaleString("vi-VN") ?? "0")}
          </p>
          <p className="mt-1 flex items-center gap-1 text-xs text-[#64748B]">
            <TrendingUp size={13} className="text-emerald-600" />
            Nguồn bài đăng crawler xử lý
          </p>
        </div>

        {/* Card 3 */}
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
              Người dùng
            </span>
            <div className="flex size-9 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <UsersRound size={18} />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold tracking-tight text-[#0F172A]">
            {loading ? "…" : (stats?.totalAccounts?.toLocaleString("vi-VN") ?? "0")}
          </p>
          <p className="mt-1 flex items-center gap-1 text-xs text-[#64748B]">
            <TrendingUp size={13} className="text-emerald-600" />
            Tài khoản hoạt động
          </p>
        </div>

        {/* Card 4 */}
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
              Tương tác
            </span>
            <div className="flex size-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <HeartHandshake size={18} />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold tracking-tight text-[#0F172A]">
            {loading ? "…" : (stats?.totalInteractions?.toLocaleString("vi-VN") ?? "0")}
          </p>
          <p className="mt-1 flex items-center gap-1 text-xs text-[#64748B]">
            <TrendingUp size={13} className="text-emerald-600" />
            Lượt quan tâm và bỏ qua
          </p>
        </div>
      </div>

      {/* 4 Line Charts Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Chart 1: Job Posting Trend */}
        <div className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-base font-bold text-[#0F172A]">
              1. Xu hướng đăng tuyển (Job Posting Trend)
            </h2>
            <p className="mt-0.5 text-xs text-[#64748B]">
              Số lượng việc làm mới được đăng theo thời gian (nguồn: ngày đăng tuyển).
            </p>
          </div>

          <div className="h-[280px] w-full">
            {loading ? (
              <div className="flex h-full items-center justify-center">
                <LoaderCircle className="size-6 animate-spin text-[#2563EB]" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={stats?.jobPostingTrend ?? []}
                  margin={{ top: 10, right: 20, left: -10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis
                    dataKey="label"
                    stroke="#94A3B8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: "#E2E8F0" }}
                    interval={getXAxisInterval(stats?.jobPostingTrend?.length ?? 0)}
                  />
                  <YAxis
                    stroke="#94A3B8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0F172A",
                      borderRadius: "12px",
                      border: "none",
                      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                      color: "#FFFFFF",
                      fontSize: "12px",
                      padding: "8px 12px",
                    }}
                    labelStyle={{ color: "#94A3B8", fontWeight: 600, marginBottom: "4px" }}
                    itemStyle={{ color: "#FFFFFF" }}
                  />
                  <Line
                    type="monotone"
                    name="Việc làm mới"
                    dataKey="count"
                    stroke="#2563EB"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: "#2563EB", strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: "#2563EB" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart 2: Crawler Performance */}
        <div className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-base font-bold text-[#0F172A]">
              2. Hiệu suất Crawler (Crawler Performance)
            </h2>
            <p className="mt-0.5 text-xs text-[#64748B]">
              Số lượng bài đăng nguồn được crawler thu thập và trạng thái xử lý.
            </p>
          </div>

          <div className="h-[280px] w-full">
            {loading ? (
              <div className="flex h-full items-center justify-center">
                <LoaderCircle className="size-6 animate-spin text-[#2563EB]" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={stats?.crawlerPerformance ?? []}
                  margin={{ top: 10, right: 20, left: -10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis
                    dataKey="label"
                    stroke="#94A3B8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: "#E2E8F0" }}
                    interval={getXAxisInterval(stats?.crawlerPerformance?.length ?? 0)}
                  />
                  <YAxis
                    stroke="#94A3B8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0F172A",
                      borderRadius: "12px",
                      border: "none",
                      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                      color: "#FFFFFF",
                      fontSize: "12px",
                      padding: "8px 12px",
                    }}
                    labelStyle={{ color: "#94A3B8", fontWeight: 600, marginBottom: "4px" }}
                  />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: "11px", paddingBottom: "10px" }}
                  />
                  <Line
                    type="monotone"
                    name="Đã crawl thành công"
                    dataKey="crawled"
                    stroke="#10B981"
                    strokeWidth={2}
                    dot={{ r: 2.5, fill: "#10B981", strokeWidth: 0 }}
                    activeDot={{ r: 4.5 }}
                  />
                  <Line
                    type="monotone"
                    name="Lỗi xử lý"
                    dataKey="error"
                    stroke="#EF4444"
                    strokeWidth={2}
                    dot={{ r: 2.5, fill: "#EF4444", strokeWidth: 0 }}
                    activeDot={{ r: 4.5 }}
                  />
                  <Line
                    type="monotone"
                    name="Tổng nguồn"
                    dataKey="total"
                    stroke="#6366F1"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart 3: User Growth */}
        <div className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-base font-bold text-[#0F172A]">
              3. Tăng trưởng người dùng (User Growth)
            </h2>
            <p className="mt-0.5 text-xs text-[#64748B]">
              Số lượng tài khoản người dùng đăng ký mới trong hệ thống.
            </p>
          </div>

          <div className="h-[280px] w-full">
            {loading ? (
              <div className="flex h-full items-center justify-center">
                <LoaderCircle className="size-6 animate-spin text-[#2563EB]" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={stats?.userGrowth ?? []}
                  margin={{ top: 10, right: 20, left: -10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis
                    dataKey="label"
                    stroke="#94A3B8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: "#E2E8F0" }}
                    interval={getXAxisInterval(stats?.userGrowth?.length ?? 0)}
                  />
                  <YAxis
                    stroke="#94A3B8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0F172A",
                      borderRadius: "12px",
                      border: "none",
                      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                      color: "#FFFFFF",
                      fontSize: "12px",
                      padding: "8px 12px",
                    }}
                    labelStyle={{ color: "#94A3B8", fontWeight: 600, marginBottom: "4px" }}
                    itemStyle={{ color: "#FFFFFF" }}
                  />
                  <Line
                    type="monotone"
                    name="Tài khoản mới"
                    dataKey="count"
                    stroke="#8B5CF6"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: "#8B5CF6", strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: "#8B5CF6" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart 4: User Engagement */}
        <div className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-base font-bold text-[#0F172A]">
              4. Mức độ tương tác (User Engagement)
            </h2>
            <p className="mt-0.5 text-xs text-[#64748B]">
              Lượt người dùng bấm quan tâm (bookmark) hoặc bỏ qua (ignore) việc làm.
            </p>
          </div>

          <div className="h-[280px] w-full">
            {loading ? (
              <div className="flex h-full items-center justify-center">
                <LoaderCircle className="size-6 animate-spin text-[#2563EB]" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={stats?.userEngagement ?? []}
                  margin={{ top: 10, right: 20, left: -10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis
                    dataKey="label"
                    stroke="#94A3B8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: "#E2E8F0" }}
                    interval={getXAxisInterval(stats?.userEngagement?.length ?? 0)}
                  />
                  <YAxis
                    stroke="#94A3B8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0F172A",
                      borderRadius: "12px",
                      border: "none",
                      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                      color: "#FFFFFF",
                      fontSize: "12px",
                      padding: "8px 12px",
                    }}
                    labelStyle={{ color: "#94A3B8", fontWeight: 600, marginBottom: "4px" }}
                  />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: "11px", paddingBottom: "10px" }}
                  />
                  <Line
                    type="monotone"
                    name="Quan tâm"
                    dataKey="interest"
                    stroke="#2563EB"
                    strokeWidth={2}
                    dot={{ r: 2.5, fill: "#2563EB", strokeWidth: 0 }}
                    activeDot={{ r: 4.5 }}
                  />
                  <Line
                    type="monotone"
                    name="Bỏ qua"
                    dataKey="ignore"
                    stroke="#94A3B8"
                    strokeWidth={2}
                    dot={{ r: 2.5, fill: "#94A3B8", strokeWidth: 0 }}
                    activeDot={{ r: 4.5 }}
                  />
                  <Line
                    type="monotone"
                    name="Tổng tương tác"
                    dataKey="total"
                    stroke="#F59E0B"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
