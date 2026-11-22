"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { ArrowRight, Eye, EyeOff, Mail, LockKeyhole } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { AuthNotice } from "@/components/auth/AuthNotice";
import { useAuth } from "@/hook/useAuth";

export default function RegisterPage() {
  const { register, isLoading, error, clearError } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [sent, setSent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearError();
    setFormError(null);
    if (password.length < 8)
      return setFormError("Mật khẩu cần có ít nhất 8 ký tự.");
    if (password !== confirmation)
      return setFormError("Mật khẩu xác nhận chưa khớp.");
    try {
      await register({ email: email.trim(), password });
      setSent(true);
    } catch {
      // Error is rendered from the auth hook.
    }
  }

  return (
    <AuthShell
      title={sent ? "Kiểm tra email của bạn" : "Tạo tài khoản"}
      description={
        sent
          ? "Chúng tôi đã gửi liên kết xác minh đến địa chỉ email của bạn."
          : "Đăng ký miễn phí để tìm công việc phù hợp với hành trình nghề nghiệp của bạn."
      }
      footer={
        <>
          Đã có tài khoản?{" "}
          <Link
            href="/login"
            className="font-semibold text-[#2563EB] hover:text-[#1D4ED8]"
          >
            Đăng nhập
          </Link>
        </>
      }
    >
      {sent ? (
        <div className="space-y-5">
          <AuthNotice kind="success">
            Email xác minh đã được gửi đến <strong>{email}</strong>. Mở liên kết
            trong email để kích hoạt tài khoản.
          </AuthNotice>
          <p className="text-sm leading-6 text-[#475569]">
            Sau khi xác minh thành công, bạn sẽ được chuyển đến trang đăng nhập.
          </p>
          <button
            type="button"
            onClick={() => setSent(false)}
            className="text-sm font-semibold text-[#2563EB] hover:text-[#1D4ED8]"
          >
            Dùng địa chỉ email khác
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {(error || formError) && (
            <AuthNotice kind="error">{formError ?? error}</AuthNotice>
          )}
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
          <label className="block">
            <span className="mb-2 block text-sm font-medium">Mật khẩu</span>
            <span className="relative block">
              <LockKeyhole
                size={18}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748B]"
              />
              <input
                required
                minLength={8}
                autoComplete="new-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Ít nhất 8 ký tự"
                className="h-12 w-full rounded-lg border border-[#CBD5E1] bg-white pl-11 pr-12 text-sm outline-none transition focus:border-[#2563EB] focus:ring-4 focus:ring-blue-100"
              />
              <button
                type="button"
                aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-[#64748B] hover:text-[#0F172A] focus-visible:outline-2 focus-visible:outline-[#2563EB]"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </span>
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium">
              Xác nhận mật khẩu
            </span>
            <span className="relative block">
              <LockKeyhole
                size={18}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748B]"
              />
              <input
                required
                minLength={8}
                autoComplete="new-password"
                type={showPassword ? "text" : "password"}
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                placeholder="Nhập lại mật khẩu"
                className="h-12 w-full rounded-lg border border-[#CBD5E1] bg-white pl-11 pr-12 text-sm outline-none transition focus:border-[#2563EB] focus:ring-4 focus:ring-blue-100"
              />
              <button
                type="button"
                aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-[#64748B] hover:text-[#0F172A] focus-visible:outline-2 focus-visible:outline-[#2563EB]"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </span>
          </label>
          <button
            disabled={isLoading}
            type="submit"
            className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#2563EB] px-4 text-sm font-semibold text-white transition hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? (
              "Đang tạo tài khoản…"
            ) : (
              <>
                Tạo tài khoản <ArrowRight size={17} />
              </>
            )}
          </button>
          <p className="text-center text-xs leading-5 text-[#64748B]">
            Bằng việc đăng ký, bạn đồng ý với các điều khoản sử dụng của
            Matchob.
          </p>
        </form>
      )}
    </AuthShell>
  );
}
