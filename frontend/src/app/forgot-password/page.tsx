"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { ArrowRight, Mail } from "lucide-react";
import { AuthNotice } from "@/components/auth/AuthNotice";
import { AuthShell } from "@/components/auth/AuthShell";
import { useAuth } from "@/hook/useAuth";

export default function ForgotPasswordPage() {
  const { requestPasswordReset, isLoading, error, clearError } = useAuth();
  const [email, setEmail] = useState("");
  const [requestSent, setRequestSent] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearError();
    try {
      await requestPasswordReset({ email: email.trim() });
      setRequestSent(true);
    } catch {
      // API errors are displayed from the auth hook.
    }
  }

  return (
    <AuthShell
      title={requestSent ? "Kiểm tra hộp thư" : "Quên mật khẩu?"}
      description={
        requestSent
          ? "Nếu email này có tài khoản Matchob, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu."
          : "Nhập email bạn đã dùng để đăng ký. Chúng tôi sẽ gửi liên kết đặt lại mật khẩu nếu tài khoản tồn tại."
      }
      footer={
        <>
          <Link
            href="/login"
            className="font-semibold text-[#2563EB] hover:text-[#1D4ED8]"
          >
            Quay lại đăng nhập
          </Link>
        </>
      }
    >
      {requestSent ? (
        <div className="space-y-5">
          <AuthNotice kind="info">
            Liên kết đặt lại mật khẩu có hiệu lực trong 30 phút.
          </AuthNotice>
          <p className="text-sm text-[#475569]">
            Chưa thấy email? Kiểm tra thư mục spam hoặc thử gửi lại.
          </p>
          <button
            type="button"
            onClick={() => setRequestSent(false)}
            className="text-sm font-semibold text-[#2563EB] hover:text-[#1D4ED8]"
          >
            Gửi lại email
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && <AuthNotice kind="error">{error}</AuthNotice>}
          <label className="block">
            <span className="mb-2 block text-sm font-medium">Email</span>
            <span className="relative block">
              <Mail
                size={18}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748B]"
              />
              <input
                required
                autoComplete="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="ban@example.com"
                className="h-12 w-full rounded-lg border border-[#CBD5E1] bg-white pl-11 pr-3 text-sm outline-none transition focus:border-[#2563EB] focus:ring-4 focus:ring-blue-100"
              />
            </span>
          </label>
          <button
            disabled={isLoading}
            type="submit"
            className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#2563EB] px-4 text-sm font-semibold text-white transition hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? (
              "Đang gửi…"
            ) : (
              <>
                Gửi liên kết đặt lại <ArrowRight size={17} />
              </>
            )}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
