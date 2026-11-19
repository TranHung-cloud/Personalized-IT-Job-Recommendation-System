"use client";

import { useCallback, useState } from "react";
import type {
  ProfileOnboardingOptions,
  ProfileOnboardingRequest,
  ProfileOption,
  ProfileView,
  QualificationOption,
} from "@/type/profile";
import { authenticatedRequest } from "@/lib/authenticatedRequest";

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080").replace(/\/$/, "");

function profileRequest<T>(path: string, token: string, init?: RequestInit) {
  return authenticatedRequest<T>(path, token, {
    ...init,
    fallbackMessage: "Không thể tải hồ sơ. Vui lòng thử lại.",
  });
}

function profileToFormData(profile: ProfileOnboardingRequest) {
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
  profile.degrees.forEach((degree, index) => {
    const prefix = `degrees[${index}]`;
    appendValue(`${prefix}.id`, degree.id);
    appendValue(`${prefix}.degMajor`, degree.degMajor);
    appendValue(`${prefix}.degInstitution`, degree.degInstitution);
    appendValue(`${prefix}.degSignedBy`, degree.degSignedBy);
    appendValue(`${prefix}.degIssuedAt`, degree.degIssuedAt);
    appendValue(`${prefix}.qualId`, degree.qualId);
    if (degree.degImage) formData.append(`${prefix}.degImage`, degree.degImage);
  });

  return formData;
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
    (token: string) => run(() => profileRequest<boolean>("/api/profiles/exists", token)),
    [run],
  );

  const getProfile = useCallback(
    (token: string) => run(() => profileRequest<ProfileView>("/api/profiles", token)),
    [run],
  );

  const getDegreeImage = useCallback(async (token: string, degreeId: string) => {
    let response: Response;
    try {
      response = await fetch(`${API_URL}/api/profiles/degrees/${degreeId}/image`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      throw new Error("Không thể kết nối máy chủ để tải ảnh bằng cấp.");
    }
    if (response.status === 401) throw new Error("SESSION_EXPIRED");
    if (!response.ok) throw new Error("Không thể tải ảnh bằng cấp.");
    return URL.createObjectURL(await response.blob());
  }, []);

  const getOptions = useCallback(
    (token: string) =>
      run(async (): Promise<ProfileOnboardingOptions> => {
        const [skills, positions, locations, workModes, qualifications] = await Promise.all([
          profileRequest<ProfileOption[]>("/api/skills", token),
          profileRequest<ProfileOption[]>("/api/positions", token),
          profileRequest<ProfileOption[]>("/api/locations", token),
          profileRequest<ProfileOption[]>("/api/work-modes", token),
          profileRequest<QualificationOption[]>("/api/qualifications", token),
        ]);
        return { skills, positions, locations, workModes, qualifications };
      }),
    [run],
  );

  const createProfile = useCallback(
    (token: string, profile: ProfileOnboardingRequest) =>
      run(async () => {
        await profileRequest<void>("/api/profiles", token, {
          method: "POST",
          body: profileToFormData(profile),
        });
      }),
    [run],
  );

  const updateProfile = useCallback(
    (token: string, profile: ProfileOnboardingRequest) =>
      run(async () => {
        await profileRequest<void>("/api/profiles", token, {
          method: "PUT",
          body: profileToFormData(profile),
        });
      }),
    [run],
  );

  return { hasProfile, getProfile, getDegreeImage, getOptions, createProfile, updateProfile, isLoading, error, clearError };
}
