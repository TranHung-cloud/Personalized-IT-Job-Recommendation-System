"use client";

import { useCallback, useState } from "react";
import type {
  DegreeInput,
  ProfileOnboardingOptions,
  ProfileOnboardingRequest,
  ProfileOption,
  QualificationOption,
} from "@/type/profile";

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
    let message = "Không thể tải hồ sơ. Vui lòng thử lại.";
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

export function useProfile() {
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

  const hasProfile = useCallback(
    (token: string) => run(() => authenticatedRequest<boolean>("/api/profiles/exists", token)),
    [run],
  );

  const getOptions = useCallback(
    (token: string) =>
      run(async (): Promise<ProfileOnboardingOptions> => {
        const [skills, positions, locations, workModes, qualifications] = await Promise.all([
          authenticatedRequest<ProfileOption[]>("/api/skills", token),
          authenticatedRequest<ProfileOption[]>("/api/positions", token),
          authenticatedRequest<ProfileOption[]>("/api/locations", token),
          authenticatedRequest<ProfileOption[]>("/api/work-modes", token),
          authenticatedRequest<QualificationOption[]>("/api/qualifications", token),
        ]);
        return { skills, positions, locations, workModes, qualifications };
      }),
    [run],
  );

  const createProfile = useCallback(
    (token: string, profile: ProfileOnboardingRequest) =>
      run(async () => {
        const formData = new FormData();
        const appendValue = (name: string, value: string | number | null | undefined) => {
          if (value !== null && value !== undefined && value !== "") {
            formData.append(name, String(value));
          }
        };

        appendValue("exptSalMin", profile.exptSalMin);
        profile.skillIds.forEach((id) => formData.append("skillIds", id));
        profile.locIds.forEach((id) => formData.append("locIds", id));
        profile.wmIds.forEach((id) => formData.append("wmIds", id));
        profile.posIds.forEach((id) => formData.append("posIds", id));
        profile.workExperiences.forEach((experience, index) => {
          const prefix = `workExperiences[${index}]`;
          appendValue(`${prefix}.companyName`, experience.companyName);
          appendValue(`${prefix}.posId`, experience.posId);
          appendValue(`${prefix}.startAt`, experience.startAt);
          appendValue(`${prefix}.endAt`, experience.endAt);
        });
        profile.degrees.forEach((degree: DegreeInput, index) => {
          const prefix = `degrees[${index}]`;
          appendValue(`${prefix}.degMajor`, degree.degMajor);
          appendValue(`${prefix}.degInstitution`, degree.degInstitution);
          appendValue(`${prefix}.degSignedBy`, degree.degSignedBy);
          appendValue(`${prefix}.degIssuedAt`, degree.degIssuedAt);
          appendValue(`${prefix}.qualId`, degree.qualId);
          formData.append(`${prefix}.degImage`, degree.degImage);
        });

        await authenticatedRequest<void>("/api/profiles", token, {
          method: "POST",
          body: formData,
        });
      }),
    [run],
  );

  return { hasProfile, getOptions, createProfile, isLoading, error, clearError };
}
