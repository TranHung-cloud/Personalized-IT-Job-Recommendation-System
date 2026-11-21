"use client";

import { useEffect, useRef, useState } from "react";
import {
  X,
  MapPin,
  Wallet,
  Clock3,
  BriefcaseBusiness,
  ExternalLink,
  RotateCcw,
  AlertCircle,
  LoaderCircle,
} from "lucide-react";
import type { JobDetailView } from "@/type/match";

type JobDetailModalProps = {
  job: JobDetailView | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onRetry: () => void;
};

function getValidJobUrl(value: string | null): string | null {
  if (!value?.trim()) return null;

  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

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
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white text-[#64748B]">
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

export function JobDetailModal({
  job,
  loading,
  error,
  onClose,
  onRetry,
}: JobDetailModalProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [logoPath, setLogoPath] = useState("/no_logo.png");

  useEffect(() => {
    setLogoPath(job?.companyLogo?.trim() || "/no_logo.png");
  }, [job?.companyLogo]);

  // Lock background scrolling and manage keyboard focus.
  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab") return;

      const dialog = closeButtonRef.current?.closest("[role='dialog']");
      if (!dialog) return;

      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => element.offsetParent !== null);

      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [onClose]);

  const jobUrl = getValidJobUrl(job?.jobUrl ?? null);

  const locations = (job?.location ?? [])
    .map((item) => item.trim())
    .filter(Boolean)
    .join(", ");

  const overview = [
    {
      label: "Mức lương",
      value: job?.salary,
      icon: Wallet,
    },
    {
      label: "Địa điểm",
      value: locations || null,
      icon: MapPin,
    },
    {
      label: "Kinh nghiệm",
      value: job?.experience,
      icon: Clock3,
    },
    {
      label: "Hình thức",
      value: job?.workMode,
      icon: BriefcaseBusiness,
    },
  ].filter((item) => item.value?.trim());

  const contentSections = [
    {
      title: "Mô tả công việc",
      content: job?.description,
    },
    {
      title: "Yêu cầu công việc",
      content: job?.requirements,
    },
    {
      title: "Phúc lợi",
      content: job?.benefits,
    },
  ].filter((section) => section.content?.trim());

  return (
    <div
      className="fixed inset-0 z-[100] bg-slate-950/45 sm:grid sm:place-items-center sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="job-detail-title"
        className="mx-auto flex h-[100dvh] w-full flex-col overflow-hidden bg-white shadow-xl sm:h-auto sm:max-h-[85vh] sm:max-w-[800px] sm:rounded-2xl"
      >
        {/* Fixed header */}
        <header className="flex shrink-0 items-start gap-3 border-b border-[#E2E8F0] bg-white px-4 py-4 sm:px-6 sm:py-5">
          <img
            src={logoPath}
            alt={job?.companyName ? `Logo ${job.companyName}` : "Logo công ty"}
            onError={() => setLogoPath("/no_logo.png")}
            className="size-12 shrink-0 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] object-contain p-1.5 sm:size-14"
          />

          <div className="min-w-0 flex-1">
            <h2
              id="job-detail-title"
              className="text-lg font-bold leading-snug tracking-tight text-[#0F172A] sm:text-xl"
            >
              {job?.title || "Chi tiết công việc"}
            </h2>

            <p className="mt-1 truncate text-sm font-medium text-[#475569]">
              {job?.companyName || "Công ty đang cập nhật"}
            </p>

            {job?.workMode && (
              <span className="mt-2 inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-semibold text-[#2563EB]">
                {job.workMode}
              </span>
            )}
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Đóng chi tiết công việc"
            className="flex size-10 shrink-0 items-center justify-center rounded-lg text-[#64748B] transition hover:bg-[#F1F5F9] hover:text-[#0F172A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB]"
          >
            <X size={21} aria-hidden="true" />
          </button>
        </header>

        {/* Independently scrollable content */}
        <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6 sm:py-6">
          {loading ? (
            <div
              role="status"
              className="flex min-h-64 flex-col items-center justify-center gap-3 text-sm text-[#64748B]"
            >
              <LoaderCircle
                size={28}
                className="animate-spin text-[#2563EB]"
                aria-hidden="true"
              />
              Đang tải thông tin công việc...
            </div>
          ) : error ? (
            <div
              role="alert"
              className="flex min-h-64 flex-col items-center justify-center text-center"
            >
              <span className="flex size-12 items-center justify-center rounded-full bg-red-50 text-[#DC2626]">
                <AlertCircle size={24} aria-hidden="true" />
              </span>

              <h3 className="mt-4 font-bold text-[#0F172A]">
                Không thể tải thông tin
              </h3>

              <p className="mt-2 max-w-sm text-sm leading-6 text-[#475569]">
                {error}
              </p>

              <button
                type="button"
                onClick={onRetry}
                className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#2563EB] px-4 text-sm font-semibold text-white transition hover:bg-[#1D4ED8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB]"
              >
                <RotateCcw size={16} aria-hidden="true" />
                Thử lại
              </button>
            </div>
          ) : job ? (
            <div className="space-y-7">
              {/* Overview */}
              {overview.length > 0 && (
                <section>
                  <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-[#475569]">
                    Tổng quan
                  </h3>

                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    {overview.map((item) => (
                      <OverviewItem
                        key={item.label}
                        label={item.label}
                        value={item.value!}
                        icon={item.icon}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* Skills */}
              {job.skills?.length > 0 && (
                <section>
                  <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-[#475569]">
                    Kỹ năng
                  </h3>

                  <ul className="flex flex-wrap gap-2">
                    {job.skills
                      .filter((skill) => skill.trim())
                      .map((skill, index) => (
                        <li
                          key={`${skill}-${index}`}
                          className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-1.5 text-xs font-medium text-[#475569] sm:text-sm"
                        >
                          {skill}
                        </li>
                      ))}
                  </ul>
                </section>
              )}

              {/* Job descriptions */}
              {contentSections.length > 0 && (
                <section>
                  <h3 className="mb-5 text-xs font-bold uppercase tracking-wider text-[#475569]">
                    Thông tin công việc
                  </h3>

                  <div className="space-y-6">
                    {contentSections.map((section, index) => (
                      <article
                        key={section.title}
                        className={
                          index > 0 ? "border-t border-[#E2E8F0] pt-5" : ""
                        }
                      >
                        <h4 className="mb-3 text-base font-bold text-[#0F172A]">
                          {section.title}
                        </h4>

                        <p className="whitespace-pre-wrap break-words text-sm leading-7 text-[#475569]">
                          {section.content}
                        </p>
                      </article>
                    ))}
                  </div>
                </section>
              )}

              {!overview.length &&
                !job.skills?.length &&
                !contentSections.length && (
                  <p className="py-12 text-center text-sm text-[#64748B]">
                    Chưa có thông tin chi tiết cho công việc này.
                  </p>
                )}
            </div>
          ) : null}
        </main>

        {/* Fixed footer */}
        <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-[#E2E8F0] bg-white px-4 py-3 sm:px-6 sm:py-4">
          <p className="hidden text-xs text-[#64748B] sm:block">
            Thông tin được tổng hợp từ tin tuyển dụng gốc.
          </p>

          {jobUrl ? (
            <a
              href={jobUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-5 text-sm font-bold text-white shadow-sm transition hover:bg-[#1D4ED8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB] sm:ml-auto sm:w-auto"
            >
              Xem tin tuyển dụng gốc
              <ExternalLink size={16} aria-hidden="true" />
            </a>
          ) : (
            <span className="text-xs text-[#94A3B8]">
              Không có liên kết tuyển dụng gốc
            </span>
          )}
        </footer>
      </section>
    </div>
  );
}
