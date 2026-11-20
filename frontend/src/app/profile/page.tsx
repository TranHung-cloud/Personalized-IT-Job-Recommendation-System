"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BadgeDollarSign,
  BriefcaseBusiness,
  GraduationCap,
  MapPin,
  Pencil,
  UserRound,
} from "lucide-react";
import { ProfileEditorForm } from "@/components/profile/ProfileEditorForm";
import { useProfile } from "@/hook/useProfile";
import type { ProfileOption, ProfileView } from "@/type/profile";
import { formatCurrency } from "@/lib/formatCurrency";
import { DegreeCertificatePreview } from "@/components/profile/DegreeCertificatePreview";
import { ToastNotice } from "@/components/ui/toast-notice";

type FormMode = "create" | "edit" | null;

function formatMonth(date: string | null) {
  if (!date) return "Hiện tại";
  const [year, month] = date.slice(0, 7).split("-");
  return `${month}/${year}`;
}

function Tags({
  items,
  emptyText,
}: {
  items: ProfileOption[];
  emptyText: string;
}) {
  if (!items.length)
    return <p className="text-sm text-[#64748B]">{emptyText}</p>;
  return (
    <ul className="flex flex-wrap gap-2">
      {items.map((item) => (
        <li
          key={item.id}
          className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm text-[#1D4ED8]"
        >
          {item.name}
        </li>
      ))}
    </ul>
  );
}

function SectionCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof BriefcaseBusiness;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[#E2E8F0] bg-white p-5 sm:p-6">
      <h2 className="mb-4 flex items-center gap-2 font-semibold text-[#0F172A]">
        <Icon size={18} className="text-[#2563EB]" aria-hidden="true" />
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const { hasProfile, getProfile } = useProfile();
  const [profile, setProfile] = useState<ProfileView | null>(null);
  const [formMode, setFormMode] = useState<FormMode>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const token = window.localStorage.getItem("accessToken");
    if (!token) {
      router.replace("/login");
      return;
    }

    try {
      const exists = await hasProfile(token);
      if (!exists) {
        setProfile(null);
        return;
      }
      setProfile(await getProfile(token));
    } catch (cause: unknown) {
      if (cause instanceof Error && cause.message === "SESSION_EXPIRED") {
        window.localStorage.removeItem("accessToken");
        window.localStorage.removeItem("accountRole");
        window.localStorage.removeItem("accountEmail");
        router.replace("/login");
        return;
      }
      setLoadError(
        cause instanceof Error ? cause.message : "Không thể tải hồ sơ.",
      );
    } finally {
      setLoading(false);
    }
  }, [getProfile, hasProfile, router]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadProfile();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadProfile, reloadKey]);

  useEffect(() => {
    const handleProfileChange = () => setReloadKey((current) => current + 1);
    window.addEventListener("profile:updated", handleProfileChange);
    return () =>
      window.removeEventListener("profile:updated", handleProfileChange);
  }, []);

  if (loading) {
    return (
      <div
        role="status"
        className="grid min-h-64 place-items-center rounded-2xl border border-[#E2E8F0] bg-white text-sm text-[#64748B]"
      >
        Đang tải hồ sơ…
      </div>
    );
  }

  if (loadError) {
    return (
      <ToastNotice kind="error" message={loadError} actionLabel="Thử tải lại" onAction={() => setReloadKey((current) => current + 1)} />
    );
  }

  if (formMode) {
    return (
      <ProfileEditorForm
        key={`${formMode}-${profile ? "existing" : "new"}`}
        mode={formMode}
        profile={formMode === "edit" ? (profile ?? undefined) : undefined}
        onCancel={() => setFormMode(null)}
        onSaved={() => {
          setFormMode(null);
          setReloadKey((current) => current + 1);
        }}
      />
    );
  }

  if (!profile) {
    return (
      <section className="grid min-h-[min(620px,calc(100vh-9rem))] place-items-center rounded-2xl border border-dashed border-[#CBD5E1] bg-white px-6 py-12 text-center">
        <div className="max-w-md">
          <div className="relative mx-auto mb-6 flex size-28 items-center justify-center rounded-full bg-blue-50 text-[#2563EB]">
            <span className="absolute -right-1 top-1 flex size-10 items-center justify-center rounded-2xl bg-white text-[#1D4ED8] shadow-sm">
              <BriefcaseBusiness size={19} aria-hidden="true" />
            </span>
            <UserRound size={52} strokeWidth={1.4} aria-hidden="true" />
            <span className="absolute -bottom-1 -left-1 flex size-9 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-sm">
              <GraduationCap size={19} aria-hidden="true" />
            </span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-[#0F172A]">
            Bạn chưa có hồ sơ
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#64748B]">
            Tạo hồ sơ để lưu kỹ năng, mong muốn công việc và kinh nghiệm của
            bạn.
          </p>
          <button
            type="button"
            onClick={() => setFormMode("create")}
            className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#2563EB] px-5 text-sm font-semibold text-white transition hover:bg-[#1D4ED8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB]"
          >
            <Pencil size={16} aria-hidden="true" />
            Tạo hồ sơ
          </button>
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-[#E2E8F0] bg-white p-5 sm:p-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#2563EB]">
            Hồ sơ cá nhân
          </p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-[#0F172A]">
            Thông tin của bạn
          </h2>
          <p className="mt-1 text-sm text-[#64748B]">
            Thông tin này giúp cá nhân hóa gợi ý việc làm.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setFormMode("edit")}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#CBD5E1] px-4 text-sm font-semibold text-[#334155] transition hover:bg-[#F8FAFC] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB]"
        >
          <Pencil size={16} aria-hidden="true" />
          Sửa hồ sơ
        </button>
      </header>

      <div className="grid items-start gap-5 xl:grid-cols-2">
        <SectionCard
          title="Mong muốn công việc & kỹ năng"
          icon={BriefcaseBusiness}
        >
          <div className="space-y-5">
            <div className="flex items-start gap-3">
              <BadgeDollarSign
                size={18}
                className="mt-0.5 shrink-0 text-[#64748B]"
                aria-hidden="true"
              />
              <div>
                <h3 className="text-sm font-medium text-[#475569]">
                  Mức lương tối thiểu mong muốn
                </h3>
                <p className="mt-1 font-semibold">
                  {profile.exptSalMin == null
                    ? "Chưa đặt"
                    : `${formatCurrency(String(profile.exptSalMin))} VNĐ/tháng`}
                </p>
              </div>
            </div>
            <div>
              <h3 className="mb-2 text-sm font-medium text-[#475569]">
                Vị trí
              </h3>
              <Tags items={profile.pos} emptyText="Chưa chọn vị trí." />
            </div>
            <div>
              <h3 className="mb-2 flex items-center gap-2 text-sm font-medium text-[#475569]">
                <MapPin size={16} aria-hidden="true" />
                Địa điểm
              </h3>
              <Tags items={profile.loc} emptyText="Chưa chọn địa điểm." />
            </div>
            <div>
              <h3 className="mb-2 text-sm font-medium text-[#475569]">
                Hình thức làm việc
              </h3>
              <Tags
                items={profile.wm}
                emptyText="Chưa chọn hình thức làm việc."
              />
            </div>
            <div className="border-t border-[#E2E8F0] pt-5">
              <h3 className="mb-2 text-sm font-medium text-[#475569]">
                Kỹ năng hiện có
              </h3>
              <Tags items={profile.skill} emptyText="Chưa thêm kỹ năng." />
            </div>
          </div>
        </SectionCard>

        <div className="space-y-5">
          <SectionCard title="Kinh nghiệm làm việc" icon={BriefcaseBusiness}>
            {profile.workExperiences.length ? (
              <ol className="space-y-4">
                {profile.workExperiences.map((experience, index) => (
                  <li
                    key={`${experience.company.id}-${experience.position.id}-${experience.startAt}-${index}`}
                    className="border-l-2 border-blue-100 pl-4"
                  >
                    <h3 className="font-semibold">
                      {experience.position.name}
                    </h3>
                    <p className="mt-0.5 text-sm text-[#475569]">
                      {experience.company.name}
                    </p>
                    <p className="mt-1 text-xs text-[#64748B]">
                      {formatMonth(experience.startAt)} –{" "}
                      {formatMonth(experience.endAt)}
                    </p>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-[#64748B]">
                Chưa thêm kinh nghiệm làm việc.
              </p>
            )}
          </SectionCard>

          <SectionCard title="Bằng cấp" icon={GraduationCap}>
            {profile.degrees.length ? (
              <ul className="space-y-4">
                {profile.degrees.map((degree) => (
                  <li
                    key={degree.id}
                    className="border-l-2 border-blue-100 pl-4"
                  >
                    <h3 className="font-semibold">{degree.degMajor}</h3>
                    <p className="mt-0.5 text-sm text-[#475569]">
                      {degree.qual.name} · {degree.degInstitution}
                    </p>
                    <p className="mt-1 text-xs text-[#64748B]">
                      Cấp bởi {degree.degSignedBy} ·{" "}
                      {formatMonth(degree.degIssuedAt)}
                    </p>
                    {degree.degImgPath && (
                      <DegreeCertificatePreview
                        degreeId={degree.id}
                        alt={`Ảnh chứng nhận ${degree.degMajor}`}
                      />
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-[#64748B]">Chưa thêm bằng cấp.</p>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
