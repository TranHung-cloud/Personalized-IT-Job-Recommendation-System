"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { AuthNotice } from "@/components/auth/AuthNotice";
import { useAuth } from "@/hook/useAuth";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isLoading, error, clearError } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearError();
    try {
      const account = await login({ email: email.trim(), password });
      router.replace(account.role?.toUpperCase() === "ADMIN" ? "/admin/dashboard" : "/user/match");
    } catch {
      // Error is rendered from the auth hook.
    }
  }

  return <AuthShell title="Chào mừng trở lại" description="Đăng nhập để tiếp tục khám phá những cơ hội phù hợp với bạn." footer={<>Chưa có tài khoản? <Link href="/register" className="font-semibold text-[#2563EB] hover:text-[#1D4ED8]">Tạo tài khoản</Link></>}>
    <form onSubmit={handleSubmit} className="space-y-5">
      {searchParams.get("verified") === "1" && <AuthNotice kind="success">Email đã được xác minh. Bạn có thể đăng nhập ngay bây giờ.</AuthNotice>}
      {searchParams.get("passwordReset") === "1" && <AuthNotice kind="success">Mật khẩu đã được đổi. Đăng nhập bằng mật khẩu mới của bạn.</AuthNotice>}
      {error && <AuthNotice kind="error">{error}</AuthNotice>}
      <label className="block"><span className="mb-2 block text-sm font-medium">Email</span><span className="relative block"><Mail size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748B]" /><input required autoComplete="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="ban@example.com" className="h-12 w-full rounded-lg border border-[#CBD5E1] bg-white pl-11 pr-3 text-sm outline-none transition focus:border-[#2563EB] focus:ring-4 focus:ring-blue-100" /></span></label>
      <label className="block"><span className="mb-2 block text-sm font-medium">Mật khẩu</span><span className="relative block"><LockKeyhole size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748B]" /><input required autoComplete="current-password" type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Nhập mật khẩu" className="h-12 w-full rounded-lg border border-[#CBD5E1] bg-white pl-11 pr-12 text-sm outline-none transition focus:border-[#2563EB] focus:ring-4 focus:ring-blue-100" /><button type="button" aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"} onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-[#64748B] hover:text-[#0F172A] focus-visible:outline-2 focus-visible:outline-[#2563EB]">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></span></label>
      <div className="-mt-2 flex justify-end"><Link href="/forgot-password" className="text-sm font-semibold text-[#2563EB] hover:text-[#1D4ED8]">Quên mật khẩu?</Link></div>
      <button disabled={isLoading} type="submit" className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#2563EB] px-4 text-sm font-semibold text-white transition hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-60">{isLoading ? "Đang đăng nhập…" : <>Đăng nhập <ArrowRight size={17} /></>}</button>
    </form>
  </AuthShell>;
}

export default function LoginPage() {
  return <Suspense fallback={<main className="grid min-h-screen place-items-center bg-[#F8FAFC] text-sm text-[#475569]">Đang tải…</main>}><LoginForm /></Suspense>;
}
