import Link from "next/link";
import type { ReactNode } from "react";
import {
  BriefcaseBusiness,
  CheckCircle2,
  Search,
  Sparkles,
} from "lucide-react";

export function AuthShell({
  children,
  title,
  description,
  footer,
}: {
  children: ReactNode;
  title: string;
  description: string;
  footer: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[#F8FAFC] px-4 py-8 text-[#0F172A] sm:px-6 lg:px-10">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-sm lg:grid-cols-[1fr_0.9fr]">
        <section className="flex flex-col justify-between p-7 sm:p-10 lg:p-14">
          <Link
            href="/"
            className="inline-flex w-fit items-center gap-2 font-semibold tracking-tight text-[#0F172A]"
          >
            <img
              src="/logo.png"
              alt="Logo"
              className="size-14 object-contain"
            />
            Matchob
          </Link>
          <div className="mx-auto w-full max-w-md py-12 lg:py-16">
            <div className="mb-8">
              <p className="mb-3 text-sm font-semibold text-[#2563EB]">
                Tài khoản Matchob
              </p>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                {title}
              </h1>
              <p className="mt-3 leading-6 text-[#475569]">{description}</p>
            </div>
            {children}
            <div className="mt-7 text-center text-sm text-[#475569]">
              {footer}
            </div>
          </div>
          <p className="text-xs text-[#64748B]">
            © 2026 Matchob · Tìm công việc phù hợp với bạn
          </p>
        </section>
        <aside className="relative hidden flex-col justify-between overflow-hidden bg-[#EFF6FF] p-12 lg:flex">
          <div className="absolute -right-24 -top-24 size-80 rounded-full border border-blue-200/70" />
          <div className="absolute -right-12 -top-12 size-56 rounded-full border border-blue-200/70" />
          <div className="relative flex items-center gap-2 text-sm font-semibold text-[#1D4ED8]">
            <Sparkles size={17} /> Gợi ý việc làm cá nhân hóa
          </div>
          <div className="relative max-w-md">
            <h2 className="text-4xl font-bold leading-tight tracking-tight">
              Cơ hội phù hợp, bắt đầu từ hồ sơ của bạn.
            </h2>
            <p className="mt-5 leading-7 text-[#475569]">
              Khám phá công việc IT phù hợp với kỹ năng, kinh nghiệm và định
              hướng nghề nghiệp của bạn.
            </p>
            <div className="mt-10 space-y-4">
              <Benefit
                icon={<Search size={18} />}
                title="Khám phá dễ dàng"
                text="Tìm cơ hội mới theo cách của bạn."
              />
              <Benefit
                icon={<CheckCircle2 size={18} />}
                title="Phù hợp hơn với bạn"
                text="Hiểu vì sao công việc phù hợp với hồ sơ."
              />
            </div>
          </div>
          <div className="relative flex items-center gap-3 rounded-xl border border-blue-100 bg-white/80 p-4">
            <div className="flex size-10 items-center justify-center rounded-full bg-blue-50 text-[#2563EB]">
              <BriefcaseBusiness size={19} />
            </div>
            <div>
              <p className="text-sm font-semibold">
                Bước tiếp theo trong sự nghiệp
              </p>
              <p className="mt-0.5 text-xs text-[#64748B]">
                Bắt đầu với một tài khoản miễn phí
              </p>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}

function Benefit({
  icon,
  title,
  text,
}: {
  icon: ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 text-[#2563EB]">{icon}</span>
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-1 text-sm text-[#475569]">{text}</p>
      </div>
    </div>
  );
}
