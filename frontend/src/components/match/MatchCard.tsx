"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowDownToLine,
  Heart,
  MapPin,
  MousePointer2,
  ThumbsDown,
  BriefcaseBusiness,
  Wallet,
  Clock3,
  Check,
  AlertCircle,
} from "lucide-react";

import { motion, useMotionValue, useTransform, animate } from "motion/react";
import type { MatchingView } from "@/type/match";
import { CompanyLogo } from "../common/CompanyLogo";

type SwipeDirection = "ignore" | "interest" | null;

type MatchCardProps = {
  match: MatchingView;
  busy: boolean;
  exitDirection: SwipeDirection;
  onIgnore: () => void;
  onInterest: () => void;
  onDetails: () => void;
  onExitComplete: () => void;
};

const SWIPE_THRESHOLD = 60;

function MatchTags({
  label,
  values,
  type,
}: {
  label: string;
  values: string[];
  type: "match" | "unmatch";
}) {
  if (!values.length) return null;

  const isMatch = type === "match";

  return (
    <div>
      <h3
        className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider ${
          isMatch ? "text-emerald-700" : "text-amber-800"
        }`}
      >
        {isMatch ? <Check size={15} /> : <AlertCircle size={15} />}
        {label}
      </h3>

      <ul className="mt-3 flex flex-wrap gap-2">
        {values.map((value) => (
          <li
            key={value}
            className={`rounded-lg border px-3 py-2 text-xs font-medium sm:text-sm ${
              isMatch
                ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                : "border-amber-100 bg-white text-amber-800"
            }`}
          >
            {value}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function MatchCard({
  match,
  busy,
  exitDirection,
  onIgnore,
  onInterest,
  onDetails,
  onExitComplete,
}: MatchCardProps) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-300, 300], [-12, 12]);
  const scale = useTransform(x, [-300, 0, 300], [0.96, 1, 0.96]);
  const ignoreOpacity = useTransform(x, [-120, -30], [1, 0]);
  const interestOpacity = useTransform(x, [30, 120], [0, 1]);
  const [isReducedMotion, setIsReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setIsReducedMotion(mediaQuery.matches);
    updatePreference();
    mediaQuery.addEventListener("change", updatePreference);
    return () => mediaQuery.removeEventListener("change", updatePreference);
  }, []);

  useEffect(() => {
    if (!exitDirection) return;

    if (isReducedMotion) {
      onExitComplete();
      return;
    }

    const direction = exitDirection === "ignore" ? -1 : 1;

    const controls = animate(x, direction * (window.innerWidth + 500), {
      type: "spring",
      stiffness: 260,
      damping: 28,
      mass: 0.8,
    });

    controls.then(() => {
      if (controls.speed !== 0) {
        onExitComplete();
      }
    });

    return () => controls.stop();
  }, [exitDirection, isReducedMotion, x, onExitComplete]);

  useEffect(() => {
    x.set(0);
  }, [match, x]);

  function completeSwipe(direction: Exclude<SwipeDirection, null>) {
    if (busy || exitDirection) return;
    if (direction === "ignore") onIgnore();
    else onInterest();
  }

  return (
    <motion.article
      drag={!busy && !exitDirection ? "x" : false}
      dragElastic={0.2}
      dragMomentum={false}
      onDragEnd={(_, info) => {
        const { x: offsetX } = info.offset;
        const { x: velocityX } = info.velocity;

        if (offsetX < -SWIPE_THRESHOLD || velocityX < -600) {
          completeSwipe("ignore");
        } else if (offsetX > SWIPE_THRESHOLD || velocityX > 600) {
          completeSwipe("interest");
        } else {
          animate(x, 0, {
            type: "spring",
            stiffness: 300,
            damping: 25,
          });
        }
      }}
      style={{
        x,
        rotate,
        scale,
        touchAction: "pan-y",
      }}
      className="relative overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm sm:p-6"
    >
      {/* Swipe feedback */}
      <motion.div
        style={{ opacity: interestOpacity }}
        className="pointer-events-none absolute left-5 top-5 z-10 rotate-[-12deg] rounded-lg border-2 border-emerald-500 px-3 py-1.5 text-sm font-bold uppercase text-emerald-600"
      >
        ♥ Quan tâm
      </motion.div>

      <motion.div
        style={{ opacity: ignoreOpacity }}
        className="pointer-events-none absolute right-5 top-5 z-10 rotate-[12deg] rounded-lg border-2 border-red-500 px-3 py-1.5 text-sm font-bold uppercase text-red-500"
      >
        ✕ Bỏ qua
      </motion.div>

      {/* Job header */}
      <div className="flex items-start gap-3 sm:gap-4">
        <CompanyLogo
          companyId={match.companyId}
          companyName={match.companyName}
          className="size-14 shrink-0 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] object-contain p-1.5 sm:size-16"
        />

        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-[#64748B] sm:text-sm">
            {match.companyName ?? "Công ty đang cập nhật"}
          </p>

          <h2 className="mt-1 text-lg font-bold leading-snug tracking-tight text-[#0F172A] sm:text-2xl">
            {match.jobTitle ?? "Vị trí đang cập nhật"}
          </h2>
        </div>

        {match.matchScore !== null && (
          <div className="shrink-0 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-center">
            <p className="text-xl font-extrabold leading-none text-[#2563EB] sm:text-2xl">
              {Math.round(match.matchScore)}%
            </p>
            <p className="mt-1 text-[9px] font-bold uppercase tracking-wider text-[#64748B] sm:text-[10px]">
              Phù hợp
            </p>
          </div>
        )}
      </div>

      {/* Job metadata */}
      <div className="mt-5 grid grid-cols-2 gap-2.5 sm:gap-3">
        {[
          {
            label: "Địa chỉ",
            value: match.location,
            icon: MapPin,
          },
          {
            label: "hình thức",
            value: match.workMode,
            icon: BriefcaseBusiness,
          },
          {
            label: "Mức lương",
            value: match.salary,
            icon: Wallet,
          },
          {
            label: "Kinh nghiệm",
            value: match.experience,
            icon: Clock3,
          },
        ]
          .filter((item) => item.value)
          .map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.label}
                className="flex min-w-0 items-start gap-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-2.5 sm:gap-3 sm:p-3"
              >
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white text-[#64748B] sm:size-9">
                  <Icon size={16} />
                </div>

                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[#64748B] sm:text-xs">
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

      {/* Matching information */}
      <div className="mt-6 space-y-5 border-t border-[#E2E8F0] pt-5">
        <MatchTags
          label="Bạn hợp với việc này thế nào?"
          values={match.match}
          type="match"
        />

        {match.unmatch.length > 0 && (
          <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-3 sm:p-4">
            <MatchTags
              label="Điểm cần cân nhắc"
              values={match.unmatch}
              type="unmatch"
            />
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="mt-6 border-t border-[#E2E8F0] pt-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onDetails}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-[#2563EB] transition hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB]"
          >
            Xem chi tiết
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={busy || Boolean(exitDirection)}
              onClick={() => completeSwipe("ignore")}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#CBD5E1] px-3 text-xs font-semibold text-[#475569] transition hover:bg-red-50 hover:text-red-600 disabled:opacity-60 sm:px-5 sm:text-sm"
            >
              <ThumbsDown size={16} />
              Bỏ qua
            </button>

            <button
              type="button"
              disabled={busy || Boolean(exitDirection)}
              onClick={() => completeSwipe("interest")}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#2563EB] px-3 text-xs font-bold text-white shadow-sm transition hover:bg-[#1D4ED8] disabled:opacity-60 sm:px-5 sm:text-sm"
            >
              <Heart size={16} />
              Quan tâm
            </button>
          </div>
        </div>

        <p className="mt-4 flex items-center justify-center gap-1.5 text-[10px] text-[#64748B] sm:text-xs">
          <MousePointer2 size={13} />
          Vuốt trái để bỏ qua · Vuốt phải để quan tâm
        </p>
      </div>
    </motion.article>
  );
}
