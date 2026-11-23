"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Bookmark,
  EyeOff,
  Eye,
  CheckCircle2,
  AlertCircle,
  LoaderCircle,
  Inbox,
  Globe,
} from "lucide-react";
import { authenticatedRequest } from "@/lib/authenticatedRequest";
import { Select } from "@/components/ui/select";
import { PaginationCard } from "@/components/common/PaginationCard";
import { AdminJobDetailModal } from "@/components/admin/AdminJobDetailModal";
import type { JobAdminView, PageResponse } from "@/type/job";

type SiteOption = { id: string; name: string };

const MISSING_FIELD_LABELS: Record<string, string> = {
  title: "Tiêu đề",
  companyName: "Tên công ty",
  companyLogo: "Logo công ty",
  salary: "Mức lương",
  experience: "Kinh nghiệm",
  description: "Mô tả",
  requirements: "Yêu cầu",
  benefits: "Đãi ngộ",
  location: "Địa điểm",
  workMode: "Hình thức",
  skills: "Kỹ năng",
  position: "Vị trí",
  qualification: "Bằng cấp",
  postedAt: "Ngày đăng",
  expiredAt: "Hạn nộp",
  jobUrl: "Link gốc",
};

export default function AdminJobsPage() {
  const router = useRouter();

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [siteId, setSiteId] = useState("");
  const [sites, setSites] = useState<SiteOption[]>([]);

  // Pagination & Data State
  const [page, setPage] = useState(0);
  const [pageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [jobs, setJobs] = useState<JobAdminView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Detail Modal State
  const [selectedJob, setSelectedJob] = useState<JobAdminView | null>(null);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(0);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Load sites for filter
  useEffect(() => {
    const token = window.localStorage.getItem("accessToken");
    if (!token) return;

    authenticatedRequest<SiteOption[]>("/api/sites", token)
      .then((data) => {
        if (Array.isArray(data)) {
          setSites(data);
        }
      })
      .catch(() => {
        // Fallback silently if sites endpoint is not reachable
      });
  }, []);

  // Load jobs list
  const loadJobs = useCallback(
    async (currentPage: number, search: string, currentSiteId: string) => {
      const token = window.localStorage.getItem("accessToken");
      if (!token) {
        router.replace("/login");
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          page: String(currentPage),
          size: String(pageSize),
          sort: "postedAt,desc",
        });

        if (search.trim()) {
          params.set("search", search.trim());
        }
        if (currentSiteId) {
          params.set("siteId", currentSiteId);
        }

        const data = await authenticatedRequest<PageResponse<JobAdminView>>(
          `/api/admin/jobs/page?${params.toString()}`,
          token,
          { fallbackMessage: "Không thể tải danh sách việc làm." },
        );

        setJobs(data.content || []);
        setTotalPages(data.totalPages || 0);
        setTotalElements(data.totalElements || 0);
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
            : "Đã xảy ra lỗi khi tải danh sách việc làm.",
        );
      } finally {
        setLoading(false);
      }
    },
    [pageSize, router],
  );

  useEffect(() => {
    void loadJobs(page, debouncedSearch, siteId);
  }, [page, debouncedSearch, siteId, loadJobs]);

  return (
    <div className="mx-auto max-w-7xl">
      <section className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-sm">
        {/* Page Header */}
        <div className="border-b border-[#E2E8F0] p-5 sm:p-6">
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-bold tracking-tight text-[#0F172A] sm:text-2xl">
              Quản lý việc làm
            </h1>
            <p className="text-sm text-[#64748B]">
              Danh sách và trạng thái toàn vẹn dữ liệu của các tin tuyển dụng thu thập từ các nguồn.
            </p>
          </div>

          {/* Filter Bar */}
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-lg">
              <span className="sr-only">Tìm kiếm việc làm</span>
              <Search
                size={16}
                className="absolute left-3.5 top-3 text-[#94A3B8]"
              />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm theo tiêu đề việc làm, công ty…"
                className="h-10 w-full rounded-xl border border-[#CBD5E1] bg-white pl-10 pr-3.5 text-sm text-[#0F172A] outline-none transition placeholder:text-[#94A3B8] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10"
              />
            </div>

            {sites.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#64748B] shrink-0">
                  Nguồn:
                </span>
                <Select
                  options={sites}
                  selectedId={siteId}
                  onChange={(id) => {
                    setSiteId(id);
                    setPage(0);
                  }}
                  placeholder="Tất cả nguồn"
                  emptyMessage="Không có nguồn nào."
                  clearLabel="Tất cả nguồn"
                  ariaLabel="Lọc theo nguồn tuyển dụng"
                  triggerClassName="min-w-[170px]"
                />
              </div>
            )}
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="m-5 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle size={18} className="shrink-0" />
            <p className="font-medium">{error}</p>
          </div>
        )}

        {/* Content Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-xs font-bold uppercase tracking-wider text-[#64748B]">
              <tr>
                <th scope="col" className="px-5 py-3.5">
                  Việc làm & Công ty
                </th>
                <th scope="col" className="px-4 py-3.5 whitespace-nowrap">
                  Nguồn
                </th>
                <th scope="col" className="px-4 py-3.5 whitespace-nowrap">
                  Tương tác
                </th>
                <th scope="col" className="px-5 py-3.5">
                  Trường còn thiếu
                </th>
                <th scope="col" className="px-5 py-3.5 text-right whitespace-nowrap">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-[#64748B]">
                    <div className="flex flex-col items-center justify-center gap-2.5">
                      <LoaderCircle className="size-7 animate-spin text-[#2563EB]" />
                      <span className="text-sm font-medium">Đang tải danh sách việc làm…</span>
                    </div>
                  </td>
                </tr>
              ) : jobs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-[#64748B]">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Inbox className="size-10 text-[#94A3B8]" />
                      <p className="text-base font-semibold text-[#0F172A]">
                        Không tìm thấy việc làm nào
                      </p>
                      <p className="text-xs text-[#64748B]">
                        Hãy thử điều chỉnh từ khóa tìm kiếm hoặc bỏ chọn bộ lọc nguồn.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                jobs.map((job) => {
                  const missing = job.missingFields || [];
                  const isComplete = missing.length === 0;

                  return (
                    <tr
                      key={job.jobId}
                      className="transition-colors hover:bg-[#F8FAFC]"
                    >
                      {/* Job Title & Company */}
                      <td className="px-5 py-4 max-w-sm">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-[#0F172A]" title={job.title ?? ""}>
                            {job.title ?? "Không có tiêu đề"}
                          </p>
                          <p className="mt-0.5 truncate text-xs font-medium text-[#64748B]" title={job.companyName ?? ""}>
                            {job.companyName ?? "Chưa rõ công ty"}
                          </p>
                        </div>
                      </td>

                      {/* Source Site */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-[#F1F5F9] px-2.5 py-1 text-xs font-semibold text-[#334155]">
                          <Globe size={13} className="text-[#64748B]" />
                          {job.site || "Khác"}
                        </span>
                      </td>

                      {/* Interaction Counts */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1 text-xs">
                          <span className="inline-flex items-center gap-1.5 font-medium text-[#2563EB]">
                            <Bookmark size={13} className="shrink-0" />
                            {job.interestCount || "0"} quan tâm
                          </span>
                          <span className="inline-flex items-center gap-1.5 font-medium text-[#94A3B8]">
                            <EyeOff size={13} className="shrink-0" />
                            {job.ignoreCount || "0"} bỏ qua
                          </span>
                        </div>
                      </td>

                      {/* Missing Fields */}
                      <td className="px-5 py-4">
                        {isComplete ? (
                          <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                            <CheckCircle2 size={13} />
                            Đầy đủ thông tin
                          </span>
                        ) : (
                          <div className="flex flex-wrap items-center gap-1.5">
                            {missing.slice(0, 3).map((field) => (
                              <span
                                key={field}
                                className="inline-flex items-center rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800"
                              >
                                {MISSING_FIELD_LABELS[field] || field}
                              </span>
                            ))}
                            {missing.length > 3 && (
                              <span
                                title={missing
                                  .slice(3)
                                  .map((f) => MISSING_FIELD_LABELS[f] || f)
                                  .join(", ")}
                                className="inline-flex items-center cursor-help rounded-md border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600"
                              >
                                +{missing.length - 3} khác
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setSelectedJob(job)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-[#CBD5E1] bg-white px-3 py-1.5 text-xs font-semibold text-[#0F172A] shadow-sm transition hover:border-[#2563EB] hover:bg-blue-50/50 hover:text-[#2563EB]"
                        >
                          <Eye size={14} />
                          Xem chi tiết
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer & Pagination */}
        {!loading && jobs.length > 0 && (
          <div className="flex flex-col items-center justify-between gap-4 border-t border-[#E2E8F0] px-5 py-3 sm:flex-row">
            <p className="text-xs font-medium text-[#64748B]">
              Hiển thị {jobs.length} / {totalElements} việc làm (Trang {page + 1}/{totalPages})
            </p>

            <PaginationCard
              currentPage={page}
              totalPages={totalPages}
              onPageChange={(newPage) => setPage(newPage)}
            />
          </div>
        )}
      </section>

      {/* Details & Raw Modal */}
      {selectedJob && (
        <AdminJobDetailModal
          jobId={selectedJob.jobId}
          initialTitle={selectedJob.title}
          initialCompanyName={selectedJob.companyName}
          onClose={() => setSelectedJob(null)}
        />
      )}
    </div>
  );
}
