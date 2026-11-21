"use client";

import { useCallback, useEffect, useState } from "react";
import { BriefcaseBusiness, Heart, RotateCcw } from "lucide-react";

import { InterestJobCard } from "@/components/interest/InterestJobCard";
import { useJobInterest } from "@/hook/useJobInterest";
import type { JobInterestView } from "@/type/job";
import { JobDetailModal } from "@/components/match/JobDetailModal";
import { useMatch } from "@/hook/useMatch";
import type { JobDetailView } from "@/type/match";
import { useRef } from "react";

export default function InterestPage() {
  const { getJobInterests, removeJobInterest } = useJobInterest();

  const [jobs, setJobs] = useState<JobInterestView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removingJobId, setRemovingJobId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const { getJobDetail } = useMatch();

  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [jobDetail, setJobDetail] = useState<JobDetailView | null>(null);
  const [jobDetailLoading, setJobDetailLoading] = useState(false);
  const [jobDetailError, setJobDetailError] = useState<string | null>(null);

  const detailRequestId = useRef(0);

  const endSession = useCallback(() => {
    window.localStorage.removeItem("accessToken");
    window.localStorage.removeItem("accountRole");
    window.localStorage.removeItem("accountEmail");
    window.location.assign("/login");
  }, []);

  const loadJobs = useCallback(async () => {
    const token = window.localStorage.getItem("accessToken");

    if (!token) {
      endSession();
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await getJobInterests(token);

      // Backend đã lọc việc hết hạn.
      setJobs(response);
    } catch (cause: unknown) {
      if (cause instanceof Error && cause.message === "SESSION_EXPIRED") {
        endSession();
        return;
      }

      setError(
        cause instanceof Error
          ? cause.message
          : "Không thể tải danh sách việc làm quan tâm.",
      );
    } finally {
      setLoading(false);
    }
  }, [endSession, getJobInterests]);

  const loadJobDetail = useCallback(
    async (jobId: string) => {
      const requestId = ++detailRequestId.current;
      const token = window.localStorage.getItem("accessToken");

      if (!token) {
        endSession();
        return;
      }

      setSelectedJobId(jobId);
      setJobDetail(null);
      setJobDetailError(null);
      setJobDetailLoading(true);

      try {
        const response = await getJobDetail(token, jobId);

        if (requestId !== detailRequestId.current) return;

        setJobDetail(response);
      } catch (cause: unknown) {
        if (requestId !== detailRequestId.current) return;

        if (cause instanceof Error && cause.message === "SESSION_EXPIRED") {
          endSession();
          return;
        }

        setJobDetailError(
          cause instanceof Error
            ? cause.message
            : "Không thể tải thông tin công việc.",
        );
      } finally {
        if (requestId === detailRequestId.current) {
          setJobDetailLoading(false);
        }
      }
    },
    [endSession, getJobDetail],
  );

  const handleCloseJobDetail = useCallback(() => {
    detailRequestId.current += 1;
    setSelectedJobId(null);
    setJobDetail(null);
    setJobDetailError(null);
    setJobDetailLoading(false);
  }, []);

  const handleRetryJobDetail = useCallback(() => {
    if (selectedJobId) {
      void loadJobDetail(selectedJobId);
    }
  }, [selectedJobId, loadJobDetail]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadJobs();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadJobs, reloadKey]);

  const handleRemove = useCallback(
    async (jobId: string) => {
      const token = window.localStorage.getItem("accessToken");

      if (!token || removingJobId) return;

      setRemovingJobId(jobId);
      setError(null);

      try {
        await removeJobInterest(token, jobId);

        setJobs((current) => current.filter((job) => job.jobId !== jobId));
      } catch (cause: unknown) {
        if (cause instanceof Error && cause.message === "SESSION_EXPIRED") {
          endSession();
          return;
        }

        setError(
          cause instanceof Error
            ? cause.message
            : "Không thể bỏ quan tâm công việc này. Vui lòng thử lại.",
        );
      } finally {
        setRemovingJobId(null);
      }
    },
    [endSession, removeJobInterest, removingJobId],
  );

  if (loading) {
    return (
      <div
        role="status"
        className="grid min-h-64 place-items-center rounded-2xl border border-[#E2E8F0] bg-white text-sm text-[#64748B]"
      >
        Đang tải việc làm quan tâm…
      </div>
    );
  }

  return (
    <>
      <div className="mx-auto max-w-4xl space-y-5">
        {/* Header */}
        <header className="rounded-2xl border border-[#E2E8F0] bg-white p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#2563EB]">
              <Heart size={22} />
            </div>

            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#2563EB]">
                Danh sách của bạn
              </p>

              <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#0F172A]">
                Việc làm quan tâm
              </h1>

              <p className="mt-1 text-sm text-[#64748B]">
                Những công việc bạn đã quan tâm và vẫn còn hạn ứng tuyển.
              </p>
            </div>
          </div>

          {!error && (
            <div className="mt-5 border-t border-[#E2E8F0] pt-4">
              <p className="text-sm text-[#64748B]">
                Tổng cộng{" "}
                <span className="font-bold text-[#0F172A]">{jobs.length}</span>{" "}
                công việc
              </p>
            </div>
          )}
        </header>

        {/* Error */}
        {error && (
          <div
            role="alert"
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            <span>{error}</span>

            <button
              type="button"
              onClick={() => setReloadKey((key) => key + 1)}
              className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg border border-red-300 px-3 font-semibold transition hover:bg-red-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
            >
              <RotateCcw size={15} />
              Thử lại
            </button>
          </div>
        )}

        {/* Job list */}
        {jobs.length > 0 ? (
          <div className="space-y-4">
            {jobs.map((job) => (
              <InterestJobCard
                key={job.jobId}
                job={job}
                busy={removingJobId === job.jobId}
                onDetails={loadJobDetail}
                onRemove={handleRemove}
              />
            ))}
          </div>
        ) : !error ? (
          <section className="grid min-h-72 place-items-center rounded-2xl border border-dashed border-[#CBD5E1] bg-white px-6 py-12 text-center">
            <div className="max-w-sm">
              <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-blue-50 text-[#2563EB]">
                <BriefcaseBusiness size={28} />
              </span>

              <h2 className="mt-5 text-lg font-bold text-[#0F172A]">
                Chưa có việc làm quan tâm
              </h2>

              <p className="mt-2 text-sm leading-6 text-[#64748B]">
                Những công việc bạn chọn quan tâm ở trang khám phá sẽ xuất hiện
                tại đây. Hãy khám phá và lưu lại những cơ hội phù hợp nhé!
              </p>

              <a
                href="/match"
                className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#2563EB] px-5 text-sm font-semibold text-white transition hover:bg-[#1D4ED8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB]"
              >
                <BriefcaseBusiness size={16} />
                Khám phá việc làm
              </a>
            </div>
          </section>
        ) : null}
      </div>
      {selectedJobId && (
        <JobDetailModal
          job={jobDetail}
          loading={jobDetailLoading}
          error={jobDetailError}
          onClose={handleCloseJobDetail}
          onRetry={handleRetryJobDetail}
        />
      )}
    </>
  );
}
