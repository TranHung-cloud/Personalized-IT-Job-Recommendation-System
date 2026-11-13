"use client";

import { useCallback, useState } from "react";
import type {
  ApiErrorResponse,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  VerifyEmailRequest,
} from "@/type/auth";

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080").replace(/\/$/, "");

async function request<T>(path: string, body: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/accounts/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("Không thể kết nối máy chủ. Vui lòng thử lại sau.");
  }

  if (!response.ok) {
    let message = "Đã có lỗi xảy ra. Vui lòng thử lại.";
    try {
      const data = (await response.json()) as ApiErrorResponse;
      message = data.detail ?? data.message ?? data.title ?? message;
    } catch {
      // Keep the readable fallback when the server response is not JSON.
    }
    throw new Error(message);
  }

  if (response.status === 204 || response.status === 202) return undefined as T;
  return (await response.json()) as T;
}

export function useAuth() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const register = useCallback(
    (data: RegisterRequest) => run(() => request<void>("register", data)),
    [run],
  );

  const login = useCallback(
    async (data: LoginRequest) => {
      const result = await run(() => request<LoginResponse>("login", data));
      window.localStorage.setItem("accessToken", result.accessToken);
      return result;
    },
    [run],
  );

  const verifyEmail = useCallback(
    (data: VerifyEmailRequest) => run(() => request<void>("verify-email", data)),
    [run],
  );

  return { register, login, verifyEmail, isLoading, error, clearError: () => setError(null) };
}
