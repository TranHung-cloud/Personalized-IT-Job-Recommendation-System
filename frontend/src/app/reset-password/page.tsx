"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { ArrowRight, LockKeyhole } from "lucide-react";
import { AuthNotice } from "@/components/auth/AuthNotice";
import { AuthShell } from "@/components/auth/AuthShell";
import { useAuth } from "@/hook/useAuth";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const { confirmPasswordReset, isLoading, error, clearError } = useAuth();
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearError();
    setFormError(null);
    if (!token) return setFormError("Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.");
    if (newPassword.length < 8) return setFormError("Mật khẩu cần có ít nhất 8 ký tự.");
    if (newPassword !== confirmation) return setFormError("Mật khẩu xác nhận chưa khớp.");

    try {
      await confirmPasswordReset({ token, newPassword });
      router.replace("/login?passwordReset=1");
    } catch {
      // API errors are displayed from the auth hook.
    }
  }

  return (
    <AuthShell
      title="Tạo mật khẩu mới"
      description="Chọn mật khẩu mới có ít nhất 8 ký tự cho tài khoản của bạn."
      footer={<>Liên kết không còn dùng được? <Link href="/forgot-password" className="font-semibold text-[#2563EB] hover:text-[#1D4ED8]">Gửi liên kết mới</Link></>}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {(error || formError) && <AuthNotice kind="error">{formError ?? error}</AuthNotice>}
        {!token && <AuthNotice kind="info">Mở trang này qua liên kết trong email đặt lại mật khẩu.</AuthNotice>}
        <label className="block">
          <span className="mb-2 block text-sm font-medium">Mật khẩu mới</span>
          <span className="relative block">
            <LockKeyhole size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748B]" />
            <input required minLength={8} autoComplete="new-password" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="Ít nhất 8 ký tự" className="h-12 w-full rounded-lg border border-[#CBD5E1] bg-white pl-11 pr-3 text-sm outline-none transition focus:border-[#2563EB] focus:ring-4 focus:ring-blue-100" />
          </span>
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium">Nhập lại mật khẩu mới</span>
          <input required minLength={8} autoComplete="new-password" type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder="Nhập lại mật khẩu mới" className="h-12 w-full rounded-lg border border-[#CBD5E1] bg-white px-3.5 text-sm outline-none transition focus:border-[#2563EB] focus:ring-4 focus:ring-blue-100" />
        </label>
        <button disabled={isLoading || !token} type="submit" className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#2563EB] px-4 text-sm font-semibold text-white transition hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-60">
          {isLoading ? "Đang cập nhật…" : <>Đổi mật khẩu <ArrowRight size={17} /></>}
        </button>
      </form>
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  return <Suspense fallback={<main className="grid min-h-screen place-items-center bg-[#F8FAFC] text-sm text-[#475569]">Đang tải…</main>}><ResetPasswordForm /></Suspense>;
}
