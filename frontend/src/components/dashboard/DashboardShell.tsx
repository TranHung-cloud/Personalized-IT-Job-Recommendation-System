"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ProfileOnboardingModal } from "@/components/profile/ProfileOnboardingModal";
import { ToastNotice } from "@/components/ui/toast-notice";
import { useProfile } from "@/hook/useProfile";
import {
  ArrowLeftRight,
  Bookmark,
  BriefcaseBusiness,
  LayoutDashboard,
  LogOut,
  Menu,
  Tags,
  UserRound,
  UsersRound,
  X,
  type LucideIcon,
} from "lucide-react";

type DashboardVariant = "user" | "admin";

type NavigationItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

const navigation: Record<DashboardVariant, NavigationItem[]> = {
  user: [
    {
      label: "Khám phá việc làm",
      href: "/match",
      icon: BriefcaseBusiness,
    },
    { label: "Việc quan tâm", href: "/interest", icon: Bookmark },
    { label: "Hồ sơ của tôi", href: "/profile", icon: UserRound },
  ],
  admin: [
    { label: "Tổng quan", href: "/admin/dashboard", icon: LayoutDashboard },
    { label: "Quản lý việc làm", href: "/admin/jobs", icon: BriefcaseBusiness },
    {
      label: "Đối soát dữ liệu",
      href: "/admin/data-matching",
      icon: ArrowLeftRight,
    },
    { label: "Tài khoản", href: "/admin/accounts", icon: UsersRound },
    { label: "Danh mục kỹ năng", href: "/admin/skills", icon: Tags },
  ],
};

export function DashboardShell({
  variant,
  children,
}: {
  variant: DashboardVariant;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [email, setEmail] = useState("");
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [profileCheckError, setProfileCheckError] = useState<string | null>(
    null,
  );
  const { hasProfile } = useProfile();
  const items = navigation[variant];
  const activeItem = items.find((item) => item.href === pathname) ?? items[0];

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const role = window.localStorage.getItem("accountRole")?.toUpperCase();
      const token = window.localStorage.getItem("accessToken");
      const correctRole =
        variant === "admin" ? role === "ADMIN" : role === "USER";

      if (!token || !correctRole) {
        router.replace("/login");
        return;
      }

      setEmail(window.localStorage.getItem("accountEmail") ?? "");
      setSessionReady(true);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [router, variant]);

  useEffect(() => {
    if (
      !sessionReady ||
      variant !== "user" ||
      window.sessionStorage.getItem("profileOnboardingSkipped") === "1"
    ) {
      return;
    }

    const token = window.localStorage.getItem("accessToken");
    if (!token) return;

    let cancelled = false;
    hasProfile(token)
      .then((exists) => {
        if (!cancelled) {
          setProfileCheckError(null);
          if (exists)
            window.sessionStorage.removeItem("profileOnboardingSkipped");
          setShowOnboarding(!exists);
        }
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        if (cause instanceof Error && cause.message === "SESSION_EXPIRED") {
          window.localStorage.removeItem("accessToken");
          window.localStorage.removeItem("accountRole");
          window.localStorage.removeItem("accountEmail");
          router.replace("/login");
          return;
        }
        setProfileCheckError(
          cause instanceof Error ? cause.message : "Không thể kiểm tra hồ sơ.",
        );
      });

    return () => {
      cancelled = true;
    };
  }, [hasProfile, router, sessionReady, variant]);

  function logout() {
    window.localStorage.removeItem("accessToken");
    window.localStorage.removeItem("accountRole");
    window.localStorage.removeItem("accountEmail");
    window.sessionStorage.removeItem("profileOnboardingSkipped");
    router.replace("/login");
  }

  if (!sessionReady) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#F8FAFC] text-sm text-[#475569]">
        Đang tải không gian làm việc…
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A]">
      {menuOpen && (
        <button
          type="button"
          aria-label="Đóng menu điều hướng"
          onClick={() => setMenuOpen(false)}
          className="fixed inset-0 z-40 cursor-pointer bg-slate-950/30 lg:hidden"
        />
      )}

      <aside
        aria-label="Menu điều hướng"
        className={`fixed inset-y-0 left-0 z-50 flex w-[276px] flex-col border-r border-[#E2E8F0] bg-white transition-transform duration-200 motion-reduce:transition-none lg:translate-x-0 ${menuOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex h-16 items-center justify-between border-b border-[#E2E8F0] px-6">
          <Link
            href={variant === "admin" ? "/admin/dashboard" : "/match"}
            className="inline-flex items-center gap-2.5 rounded-md font-semibold tracking-tight focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2563EB]"
          >
            <img
              src="/logo.png"
              alt="Logo"
              className="size-10 object-contain"
            />
            <span>Matchob</span>
          </Link>
          <button
            type="button"
            onClick={() => setMenuOpen(false)}
            aria-label="Đóng menu"
            className="rounded-lg p-2 text-[#64748B] hover:bg-[#F1F5F9] focus-visible:outline-2 focus-visible:outline-[#2563EB] lg:hidden"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-5 pb-3 pt-6">
          <p className="px-3 text-xs font-semibold uppercase tracking-[0.08em] text-[#64748B]">
            {variant === "admin" ? "Quản trị" : "Không gian của bạn"}
          </p>
        </div>
        <nav className="flex-1 space-y-1 px-3" aria-label="Điều hướng chính">
          {items.map(({ label, href, icon: Icon }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                aria-current={isActive ? "page" : undefined}
                onClick={() => setMenuOpen(false)}
                className={`flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB] ${isActive ? "bg-blue-50 text-[#1D4ED8]" : "text-[#475569] hover:bg-[#F8FAFC] hover:text-[#0F172A]"}`}
              >
                <Icon size={18} aria-hidden="true" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-[#E2E8F0] p-4">
          <div className="mb-3 flex min-w-0 items-center gap-3 px-2 py-1">
            <span
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-[#1D4ED8]"
              aria-hidden="true"
            >
              {email.charAt(0).toUpperCase() ||
                (variant === "admin" ? "A" : "U")}
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold">
                {variant === "admin" ? "Quản trị viên" : "Tài khoản của bạn"}
              </p>
              <p className="truncate text-xs text-[#64748B]">{email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            className="flex min-h-10 w-full cursor-pointer items-center gap-3 rounded-lg px-3 text-sm font-medium text-[#475569] transition-colors hover:bg-[#F8FAFC] hover:text-[#0F172A] focus-visible:outline-2 focus-visible:outline-[#2563EB]"
          >
            <LogOut size={17} aria-hidden="true" />
            Đăng xuất
          </button>
        </div>
      </aside>

      <div className="min-h-screen lg:pl-[276px]">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[#E2E8F0] bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Mở menu điều hướng"
              aria-expanded={menuOpen}
              className="-ml-2 rounded-lg p-2 text-[#475569] hover:bg-[#F1F5F9] focus-visible:outline-2 focus-visible:outline-[#2563EB] lg:hidden"
            >
              <Menu size={20} />
            </button>
            <h1 className="truncate text-base font-semibold sm:text-lg">
              {activeItem.label}
            </h1>
          </div>
          <div className="hidden max-w-[40%] truncate text-sm text-[#64748B] sm:block">
            {email}
          </div>
        </header>
        <main
          id="main-content"
          className="min-h-[calc(100vh-4rem)] p-4 sm:p-6 lg:p-8"
        >
          {variant === "user" && profileCheckError && (
            <ToastNotice
              kind="warning"
              message={profileCheckError}
              actionLabel="Thử lại"
              onAction={() => window.location.reload()}
            />
          )}
          {children}
        </main>
      </div>
      {variant === "user" && showOnboarding && (
        <ProfileOnboardingModal
          onSkip={() => {
            window.sessionStorage.setItem("profileOnboardingSkipped", "1");
            setShowOnboarding(false);
          }}
          onCompleted={() => {
            window.sessionStorage.removeItem("profileOnboardingSkipped");
            window.dispatchEvent(new Event("profile:updated"));
            setShowOnboarding(false);
          }}
        />
      )}
    </div>
  );
}
