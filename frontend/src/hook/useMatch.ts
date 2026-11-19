"use client";

import { useCallback, useState } from "react";
import { authenticatedRequest } from "@/lib/authenticatedRequest";
import type { JobDetailView, MatchAction, MatchResponse } from "@/type/match";

function matchRequest<T>(path: string, token: string, init?: RequestInit) {
  return authenticatedRequest<T>(path, token, {
    ...init,
    fallbackMessage: "Không thể tải kết quả ghép việc. Vui lòng thử lại.",
  });
}

export function useMatch() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clearError = useCallback(() => setError(null), []);

  const run = useCallback(async <T,>(action: () => Promise<T>) => {
    setIsLoading(true);
    setError(null);
    try {
      return await action();
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Đã có lỗi xảy ra.";
      setError(message);
      throw cause;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getMatches = useCallback(
    (token: string, excludeJobIds?: string[]) =>
      run(() => {
        const exclusions = excludeJobIds?.slice(0, 5) ?? [];
        const query = exclusions.length
          ? `?${new URLSearchParams({ excludeJobIds: exclusions.join(",") }).toString()}`
          : "";
        return matchRequest<MatchResponse>(`/api/matches${query}`, token);
      }),
    [run],
  );

  const getJobDetail = useCallback(
    (token: string, jobId: string) =>
      run(() => matchRequest<JobDetailView>(`/api/jobs/${encodeURIComponent(jobId)}`, token)),
    [run],
  );

  const saveInteraction = useCallback(
    (token: string, jobId: string, action: MatchAction) =>
      run(() =>
        matchRequest<void>(`/api/matches/${encodeURIComponent(jobId)}/interaction`, token, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        }),
      ),
    [run],
  );

  const undoInteraction = useCallback(
    (token: string, jobId: string) =>
      run(() =>
        matchRequest<{ jobStillEligible: boolean }>(
          `/api/matches/${encodeURIComponent(jobId)}/interaction`,
          token,
          { method: "DELETE" },
        ),
      ),
    [run],
  );

  return { getMatches, getJobDetail, saveInteraction, undoInteraction, isLoading, error, clearError };
}
