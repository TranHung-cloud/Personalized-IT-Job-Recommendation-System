"use client";

import { useCallback, useState } from "react";
import type { JobDetailView, MatchAction, MatchResponse } from "@/type/match";

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080").replace(/\/$/, "");

async function authenticatedRequest<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(init?.headers ?? {}),
      },
    });
  } catch {
    throw new Error("Không thể kết nối máy chủ. Vui lòng thử lại sau.");
  }

  if (!response.ok) {
    if (response.status === 401) throw new Error("SESSION_EXPIRED");
    let message = "Không thể tải kết quả ghép việc. Vui lòng thử lại.";
    try {
      const body = (await response.json()) as { detail?: string; message?: string; title?: string };
      message = body.detail ?? body.message ?? body.title ?? message;
    } catch {
      // Use the fallback when the response has no JSON body.
    }
    throw new Error(message);
  }

  if (response.status === 204 || response.status === 202) return undefined as T;
  if (response.headers.get("content-type")?.includes("application/json")) {
    return (await response.json()) as T;
  }
  return undefined as T;
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
        const query = excludeJobIds?.length
          ? `?${new URLSearchParams({ excludeJobIds: excludeJobIds.join(",") }).toString()}`
          : "";
        return authenticatedRequest<MatchResponse>(`/api/matches${query}`, token);
      }),
    [run],
  );

  const getJobDetail = useCallback(
    (token: string, jobId: string) =>
      run(() => authenticatedRequest<JobDetailView>(`/api/jobs/${encodeURIComponent(jobId)}`, token)),
    [run],
  );

  const saveInteraction = useCallback(
    (token: string, jobId: string, action: MatchAction) =>
      run(() =>
        authenticatedRequest<void>(`/api/matches/${encodeURIComponent(jobId)}/interaction`, token, {
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
        authenticatedRequest<{ jobStillEligible: boolean }>(
          `/api/matches/${encodeURIComponent(jobId)}/interaction`,
          token,
          { method: "DELETE" },
        ),
      ),
    [run],
  );

  return { getMatches, getJobDetail, saveInteraction, undoInteraction, isLoading, error, clearError };
}
