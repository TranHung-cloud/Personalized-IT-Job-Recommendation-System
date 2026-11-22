"use client";

import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { AuthNotice } from "@/components/auth/AuthNotice";
import { useAuth } from "@/hook/useAuth";

function VerificationStatus() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const { verifyEmail } = useAuth();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    token ? "loading" : "error",
  );
  const [message, setMessage] = useState(
    token ? "" : "Liên kết xác minh không hợp lệ hoặc đã bị thiếu mã xác minh.",
  );
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;
    if (!token) return;
    verifyEmail({ token })
      .then(() => {
        setStatus("success");
        setMessage(
          "Email của bạn đã được xác minh thành công. Đang chuyển đến trang đăng nhập…",
        );
        window.setTimeout(() => router.replace("/login?verified=1"), 1400);
      })
      .catch((cause: unknown) => {
        setStatus("error");
        setMessage(
          cause instanceof Error
            ? cause.message
            : "Không thể xác minh email. Vui lòng thử lại.",
        );
      });
  }, [router, token, verifyEmail]);

  return (
    <AuthShell
      title={
        status === "success"
          ? "Xác minh thành công"
          : status === "error"
            ? "Không thể xác minh email"
            : "Đang xác minh email"
      }
      description="Xác minh email để kích hoạt tài khoản Matchob của bạn."
      footer={
        <>
          Cần tạo tài khoản khác?{" "}
          <Link
            href="/register"
            className="font-semibold text-[#2563EB] hover:text-[#1D4ED8]"
          >
            Đăng ký
          </Link>
        </>
      }
    >
      <div className="space-y-5">
        {status === "loading" ? (
          <div
            role="status"
            className="flex items-center gap-3 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-4 text-sm text-[#475569]"
          >
            <span className="size-5 animate-spin rounded-full border-2 border-blue-200 border-t-[#2563EB] motion-reduce:animate-none" />
            Đang kiểm tra liên kết xác minh…
          </div>
        ) : (
          <AuthNotice kind={status === "success" ? "success" : "error"}>
            {message}
          </AuthNotice>
        )}
        {status === "error" && (
          <Link
            href="/login"
            className="inline-flex h-12 w-full items-center justify-center rounded-lg bg-[#2563EB] px-4 text-sm font-semibold text-white transition hover:bg-[#1D4ED8]"
          >
            Đến trang đăng nhập
          </Link>
        )}
      </div>
    </AuthShell>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <main className="grid min-h-screen place-items-center bg-[#F8FAFC] text-sm text-[#475569]">
          Đang tải…
        </main>
      }
    >
      <VerificationStatus />
    </Suspense>
  );
}
