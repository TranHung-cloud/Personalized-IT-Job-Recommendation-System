"use client";

import { useEffect, useState } from "react";
import {
  BriefcaseBusiness,
  Clock3,
  ExternalLink,
  MapPin,
  Trash2,
  Wallet,
} from "lucide-react";
import { animate, motion, useMotionValue } from "motion/react";
import type { JobInterestView } from "@/type/job";
import { CompanyLogo } from "../common/CompanyLogo";

type InterestJobCardProps = {
  job: JobInterestView;
  busy: boolean;
  onDetails: (jobId: string) => void;
  onRemove: (jobId: string) => void;
};

function formatDate(date: string | null) {
  if (!date) return null;

  const parsed = new Date(`${date}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) return null;

  return parsed.toLocaleDateString("vi-VN");
}

export function InterestJobCard({
  job,
  busy,
  onDetails,
  onRemove,
}: InterestJobCardProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const x = useMotionValue(0);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");

    const update = () => setIsMobile(media.matches);

    update();
    media.addEventListener("change", update);

    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    animate(x, 0, { duration: 0.2 });
    setRevealed(false);
  }, [job.jobId, x]);

  const expiredDate = formatDate(job.expiredAt);

  const metadata = [
    {
      label: "Mức lương",
      value: job.salary,
      icon: Wallet,
    },
    {
      label: "Kinh nghiệm",
      value: job.experience,
      icon: Clock3,
    },
    {
      label: "Hình thức",
      value: job.workMode,
      icon: BriefcaseBusiness,
    },
    {
      label: "Địa điểm",
      value: job.location?.join(", "),
      icon: MapPin,
    },
  ].filter((item) => item.value);

  function handleDragEnd(
    _: unknown,
    info: { offset: { x: number }; velocity: { x: number } },
  ) {
    if (busy) return;

    const offset = info.offset.x;
    const velocity = info.velocity.x;

    // Swipe lần hai: bỏ quan tâm.
    if (revealed && (offset < -45 || velocity < -500)) {
      onRemove(job.jobId);
      return;
    }

    // Swipe lần đầu: hiện vùng xóa.
    if (offset < -55 || velocity < -500) {
      animate(x, -92, {
        type: "spring",
        stiffness: 350,
        damping: 30,
      });
      setRevealed(true);
      return;
    }

    // Vuốt sang phải: đóng vùng xóa.
    if (offset > 40 || velocity > 500) {
      animate(x, 0, {
        type: "spring",
        stiffness: 350,
        damping: 30,
      });
      setRevealed(false);
      return;
    }

    animate(x, revealed ? -92 : 0, {
      type: "spring",
      stiffness: 350,
      damping: 30,
    });
  }

  return (
    <div className="relative overflow-hidden rounded-2xl">
      {/* Mobile delete background */}
      {isMobile && (
        <div className="absolute inset-y-0 -left-1 right-0 flex items-center justify-end bg-red-500">
          <div className="flex w-[92px] h-full items-center justify-center">
            <button
              type="button"
              disabled={busy}
              onClick={() => onRemove(job.jobId)}
              aria-label="Bỏ quan tâm"
              className="flex size-full flex-col items-center justify-center gap-1 text-white transition hover:bg-red-600 disabled:opacity-60"
            >
              <Trash2 size={23} />
              <span className="text-xs font-semibold">Xóa</span>
            </button>
          </div>
        </div>
      )}

      <motion.article
        drag={isMobile && !busy ? "x" : false}
        dragConstraints={{ left: -92, right: 0 }}
        dragElastic={0}
        dragMomentum={false}
        onDragEnd={handleDragEnd}
        style={{
          x,
          touchAction: "pan-y",
        }}
        className="relative rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm sm:p-5"
      >
        {/* Header */}
        <div className="flex items-start gap-3">
          <CompanyLogo
            companyId={job.companyId}
            companyName={job.companyName}
            className="size-12 shrink-0 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] object-contain p-1.5 sm:size-14"
          />

          {/* <img
            src={logoPath}
            alt={job.companyName ? `Logo ${job.companyName}` : "Logo công ty"}
            onError={() => setLogoPath("/no_logo.png")}
            className="size-12 shrink-0 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] object-contain p-1.5 sm:size-14"
          /> */}

          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-[#64748B] sm:text-sm">
              {job.companyName || "Công ty đang cập nhật"}
            </p>

            <h2 className="mt-1 text-base font-bold leading-snug text-[#0F172A] sm:text-lg">
              {job.title || "Vị trí đang cập nhật"}
            </h2>
          </div>
        </div>

        {/* Metadata */}
        {metadata.length > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-2 sm:gap-3">
            {metadata.map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.label}
                  className="flex min-w-0 items-start gap-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-2.5 sm:p-3"
                >
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white text-[#64748B]">
                    <Icon size={16} />
                  </div>

                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-[#64748B]">
                      {item.label}
                    </p>

                    <p className="mt-1 break-words text-xs font-semibold leading-relaxed text-[#0F172A] sm:text-sm">
                      {item.value}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#E2E8F0] pt-4">
          <div className="min-w-0">
            {expiredDate && (
              <p className="text-xs text-[#64748B]">
                Hạn ứng tuyển:{" "}
                <span className="font-semibold text-[#0F172A]">
                  {expiredDate}
                </span>
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onDetails(job.jobId)}
              className="inline-flex min-h-10 items-center rounded-lg px-3 text-xs font-semibold text-[#2563EB] transition hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB] sm:text-sm"
            >
              Xem chi tiết
            </button>
            {/* Desktop remove button */}
            <button
              type="button"
              disabled={busy}
              onClick={() => onRemove(job.jobId)}
              className="hidden min-h-10 items-center gap-2 rounded-lg border border-red-200 px-3 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 md:inline-flex"
            >
              <Trash2 size={15} />
              Bỏ quan tâm
            </button>
          </div>
        </div>
      </motion.article>
    </div>
  );
}
