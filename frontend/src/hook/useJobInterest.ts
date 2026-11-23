"use client";

import { useCallback, useState } from "react";
import { authenticatedRequest } from "@/lib/authenticatedRequest";
import type { JobInterestView, PageResponse } from "@/type/job";

export function useJobInterest() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getJobInterests = useCallback(
    async (
      token: string,
      search = "",
      page = 0,
      size = 10,
    ) => {
      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          search,
          page: String(page),
          size: String(size),
        });

        return await authenticatedRequest<PageResponse<JobInterestView>>(
          `/api/jobs/interest?${params.toString()}`,
          token,
          {
            fallbackMessage: "Không thể tải danh sách việc làm quan tâm.",
          },
        );
      } catch (cause) {
        const message =
          cause instanceof Error ? cause.message : "Đã có lỗi xảy ra.";
        setError(message);
        throw cause;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );


  const removeJobInterest = useCallback(
    async (token: string, jobId: string) => {
      setError(null);

      try {
        await authenticatedRequest<void>(
          `/api/jobs/interest/${encodeURIComponent(jobId)}`,
          token,
          {
            method: "DELETE",
            fallbackMessage: "Không thể bỏ quan tâm công việc này.",
          },
        );
      } catch (cause) {
        const message =
          cause instanceof Error ? cause.message : "Đã có lỗi xảy ra.";
        setError(message);
        throw cause;
      }
    },
    [],
  );

  return {
    getJobInterests,
    removeJobInterest,
    isLoading,
    error,
  };
}
