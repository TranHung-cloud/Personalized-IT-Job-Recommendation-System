"use client";

import { useEffect, useRef, useState } from "react";
import {
  X,
  MapPin,
  Wallet,
  Clock3,
  BriefcaseBusiness,
  ExternalLink,
  AlertCircle,
  LoaderCircle,
  FileCode,
  FileText,
  Calendar,
  GraduationCap,
} from "lucide-react";
import type { JobDetailView } from "@/type/match";
import { CompanyLogo } from "@/components/common/CompanyLogo";
import { authenticatedRequest } from "@/lib/authenticatedRequest";

type AdminJobDetailModalProps = {
  jobId: string | null;
  initialTitle?: string | null;
  initialCompanyName?: string | null;
  onClose: () => void;
};

type ActiveTab = "detail" | "raw";

function OverviewItem({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof MapPin;
}) {
  return (
    <div className="flex min-w-0 items-start gap-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white text-[#64748B] shadow-sm">
        <Icon size={17} aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[#64748B]">
          {label}
        </p>
        <p className="mt-1 break-words text-sm font-semibold leading-relaxed text-[#0F172A]">
          {value}
        </p>
      </div>
    </div>
  );
}

function SectionContent({
  title,
  content,
}: {
  title: string;
  content: string | null;
}) {
  if (!content?.trim()) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-bold uppercase tracking-wider text-[#475569]">
        {title}
      </h3>
      <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 text-sm leading-relaxed text-[#334155] whitespace-pre-line">
        {content}
      </div>
    </div>
  );
}

export function AdminJobDetailModal({
  jobId,
  initialTitle,
  initialCompanyName,
  onClose,
}: AdminJobDetailModalProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>("detail");
  const [jobDetail, setJobDetail] = useState<JobDetailView | null>(null);
  const [rawJson, setRawJson] = useState<unknown | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [loadingRaw, setLoadingRaw] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [rawError, setRawError] = useState<string | null>(null);

  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!jobId) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [jobId, onClose]);

  useEffect(() => {
    if (!jobId) return;

    const token = window.localStorage.getItem("accessToken") ?? "";
    if (!token) return;

    setLoadingDetail(true);
    setDetailError(null);
    authenticatedRequest<JobDetailView>(`/api/jobs/${jobId}`, token, {
      fallbackMessage: "Không thể tải chi tiết việc làm.",
    })
      .then((data) => setJobDetail(data))
      .catch((err: unknown) => {
        setDetailError(
          err instanceof Error
            ? err.message
            : "Đã có lỗi xảy ra khi tải dữ liệu.",
        );
      })
      .finally(() => setLoadingDetail(false));

    setLoadingRaw(true);
    setRawError(null);
    authenticatedRequest<unknown>(`/api/admin/jobs/${jobId}/raw`, token, {
      fallbackMessage: "Không thể tải dữ liệu raw JSON.",
    })
      .then((data) => setRawJson(data))
      .catch((err: unknown) => {
        setRawError(
          err instanceof Error
            ? err.message
            : "Chưa có dữ liệu mô tả thô cho việc làm này.",
        );
      })
      .finally(() => setLoadingRaw(false));
  }, [jobId]);

  if (!jobId) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-job-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#0F172A]/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div className="relative flex max-h-[90vh] w-full max-w-4xl flex-col rounded-2xl border border-[#E2E8F0] bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-[#E2E8F0] p-5">
          <div className="flex items-center gap-3.5 min-w-0">
            {jobDetail && (
              <CompanyLogo
                companyId={jobDetail.companyId}
                companyName={jobDetail.companyName ?? initialCompanyName ?? ""}
                className="size-12 shrink-0 rounded-xl"
              />
            )}
            <div className="min-w-0">
              <h2
                id="admin-job-modal-title"
                className="truncate text-lg font-bold text-[#0F172A] sm:text-xl"
              >
                {jobDetail?.title ?? initialTitle ?? "Chi tiết việc làm"}
              </h2>
              <p className="truncate text-sm font-medium text-[#64748B]">
                {jobDetail?.companyName ?? initialCompanyName ?? "Đang tải…"}
              </p>
            </div>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Đóng popup"
            className="rounded-xl p-2 text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A] transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-[#E2E8F0] bg-[#F8FAFC] px-5 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab("detail")}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
              activeTab === "detail"
                ? "border-[#2563EB] text-[#2563EB]"
                : "border-transparent text-[#64748B] hover:text-[#0F172A]"
            }`}
          >
            <FileText size={16} />
            Thông tin chuẩn hóa
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("raw")}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
              activeTab === "raw"
                ? "border-[#2563EB] text-[#2563EB]"
                : "border-transparent text-[#64748B] hover:text-[#0F172A]"
            }`}
          >
            <FileCode size={16} />
            Dữ liệu JSON thô (Raw)
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          {activeTab === "detail" && (
            <>
              {loadingDetail && (
                <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 text-center">
                  <LoaderCircle className="size-8 animate-spin text-[#2563EB]" />
                  <p className="text-sm font-medium text-[#64748B]">
                    Đang tải thông tin việc làm…
                  </p>
                </div>
              )}

              {!loadingDetail && detailError && (
                <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 text-center p-6 text-[#DC2626]">
                  <AlertCircle size={36} />
                  <p className="text-sm font-medium">{detailError}</p>
                </div>
              )}

              {!loadingDetail && !detailError && jobDetail && (
                <div className="space-y-6">
                  {/* Overview Cards */}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <OverviewItem
                      label="địa điểm"
                      value={
                        jobDetail.location?.length
                          ? jobDetail.location.join(", ")
                          : "Chưa xác định"
                      }
                      icon={MapPin}
                    />
                    <OverviewItem
                      label="Kinh nghiệm"
                      value={jobDetail.experience ?? "Không yêu cầu"}
                      icon={Clock3}
                    />
                    <OverviewItem
                      label="Hình thức"
                      value={jobDetail.workMode ?? "Chưa rõ"}
                      icon={BriefcaseBusiness}
                    />
                    <OverviewItem
                      label="Trình độ"
                      value={jobDetail.qualification ?? "Không yêu cầu"}
                      icon={GraduationCap}
                    />
                  </div>

                  {/* Date & Salary */}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="flex items-start gap-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white text-[#64748B] shadow-sm">
                        <Wallet size={17} />
                      </span>
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-[#64748B]">
                          Mức lương
                        </p>
                        <p className="mt-1 text-sm font-semibold text-[#0F172A]">
                          {jobDetail.salary ?? "Thỏa thuận / Chưa cập nhật"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white text-[#64748B] shadow-sm">
                        <Calendar size={17} />
                      </span>
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-[#64748B]">
                          Thời gian
                        </p>
                        <p className="mt-1 text-sm font-semibold text-[#0F172A]">
                          Đăng: {jobDetail.postedAt ?? "—"} | Hạn:{" "}
                          {jobDetail.expiredAt ?? "Không thời hạn"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Skills */}
                  {jobDetail.skills && jobDetail.skills.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-[#475569]">
                        Kỹ năng yêu cầu
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {jobDetail.skills.map((skill) => (
                          <span
                            key={skill}
                            className="inline-flex items-center rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-[#2563EB]"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Description, Requirements, Benefits */}
                  <SectionContent
                    title="Mô tả công việc"
                    content={jobDetail.description}
                  />
                  <SectionContent
                    title="Yêu cầu ứng viên"
                    content={jobDetail.requirements}
                  />
                  <SectionContent
                    title="Quyền lợi & Đãi ngộ"
                    content={jobDetail.benefits}
                  />

                  {/* External Job Link */}
                  {jobDetail.jobUrl && (
                    <div className="pt-2">
                      <a
                        href={jobDetail.jobUrl}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="inline-flex items-center gap-2 rounded-xl bg-[#2563EB] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition"
                      >
                        Mở bài đăng gốc trên trang tuyển dụng
                        <ExternalLink size={16} />
                      </a>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {activeTab === "raw" && (
            <>
              {loadingRaw && (
                <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 text-center">
                  <LoaderCircle className="size-8 animate-spin text-[#2563EB]" />
                  <p className="text-sm font-medium text-[#64748B]">
                    Đang tải dữ liệu JSON thô…
                  </p>
                </div>
              )}

              {!loadingRaw && rawError && (
                <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 text-center p-6 text-[#DC2626]">
                  <AlertCircle size={36} />
                  <p className="text-sm font-medium">{rawError}</p>
                </div>
              )}

              {!loadingRaw && !rawError && rawJson !== null && (
                <div className="relative">
                  <pre className="max-h-[500px] overflow-auto whitespace-pre-wrap break-words rounded-xl border border-[#CBD5E1] bg-[#0F172A] p-4 text-xs font-mono text-[#E2E8F0] leading-relaxed select-text">
                    <code>{JSON.stringify(rawJson, null, 2)}</code>
                  </pre>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
