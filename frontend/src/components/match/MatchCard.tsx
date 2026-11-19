"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowDownToLine,
  Heart,
  MapPin,
  MousePointer2,
  ThumbsDown,
} from "lucide-react";
import type { MatchingView } from "@/type/match";

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

const SWIPE_THRESHOLD = 72;

function MatchTags({
  label,
  values,
  className,
}: {
  label: string;
  values: string[];
  className: string;
}) {
  if (!values.length) return null;

  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-[#64748B]">
        {label}
      </h3>
      <ul className="mt-2 flex flex-wrap gap-2">
        {values.map((value) => (
          <li key={value} className={`rounded-full px-2.5 py-1 text-xs font-medium ${className}`}>
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
  const pointerStart = useRef<number | null>(null);
  const [isReducedMotion, setIsReducedMotion] = useState(false);
  const [logoPath, setLogoPath] = useState(
    match.companyLogoPath?.trim() || "/no_logo.png",
  );

  useEffect(() => {
    setLogoPath(match.companyLogoPath?.trim() || "/no_logo.png");
  }, [match.companyLogoPath]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setIsReducedMotion(mediaQuery.matches);
    updatePreference();
    mediaQuery.addEventListener("change", updatePreference);
    return () => mediaQuery.removeEventListener("change", updatePreference);
  }, []);

  useEffect(() => {
    if (!exitDirection || !isReducedMotion) return;
    const timeoutId = window.setTimeout(onExitComplete, 0);
    return () => window.clearTimeout(timeoutId);
  }, [exitDirection, isReducedMotion, onExitComplete]);

  function completeSwipe(direction: Exclude<SwipeDirection, null>) {
    if (busy || exitDirection) return;
    if (direction === "ignore") onIgnore();
    else onInterest();
  }

  function handlePointerDown(event: React.PointerEvent<HTMLElement>) {
    if (busy || exitDirection || event.pointerType === "mouse") return;
    pointerStart.current = event.clientX;
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerUp(event: React.PointerEvent<HTMLElement>) {
    if (pointerStart.current === null) return;
    const distance = event.clientX - pointerStart.current;
    pointerStart.current = null;
    if (distance <= -SWIPE_THRESHOLD) completeSwipe("ignore");
    if (distance >= SWIPE_THRESHOLD) completeSwipe("interest");
  }

  const exitClass =
    exitDirection === "ignore"
      ? "-translate-x-[115%] -rotate-6 opacity-0"
      : exitDirection === "interest"
        ? "translate-x-[115%] rotate-6 opacity-0"
        : "translate-x-0 rotate-0 opacity-100";

  return (
    <article
      aria-busy={busy}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => {
        pointerStart.current = null;
      }}
      onTransitionEnd={(event) => {
        if (exitDirection && event.propertyName === "transform") onExitComplete();
      }}
      className={`touch-pan-y rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm transition-[transform,opacity] duration-200 ease-out motion-reduce:transition-none sm:p-6 ${exitClass}`}
    >
      <div className="flex items-start gap-4">
        <img
          src={logoPath}
          alt={match.companyName ? `Logo ${match.companyName}` : "Logo công ty"}
          onError={() => setLogoPath("/no_logo.png")}
          className="size-14 shrink-0 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] object-contain p-1.5"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-sm font-medium text-[#475569]">
                {match.companyName ?? "Công ty đang cập nhật"}
              </p>
              <h2 className="mt-1 text-xl font-bold tracking-tight text-[#0F172A] sm:text-2xl">
                {match.jobTitle ?? "Vị trí đang cập nhật"}
              </h2>
            </div>
            {match.matchScore !== null && (
              <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-bold text-[#1D4ED8]">
                {Math.round(match.matchScore)}% phù hợp
              </span>
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-[#475569]">
            {match.location && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin size={16} aria-hidden="true" />
                {match.location}
              </span>
            )}
            {match.workMode && <span>{match.workMode}</span>}
            {match.salary && <span>{match.salary}</span>}
            {match.experience && <span>{match.experience}</span>}
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-5 border-t border-[#E2E8F0] pt-5 sm:grid-cols-2">
        <MatchTags
          label="Phù hợp"
          values={match.match}
          className="border border-emerald-200 bg-emerald-50 text-emerald-700"
        />
        <MatchTags
          label="Cần cân nhắc"
          values={match.unmatch}
          className="border border-amber-200 bg-amber-50 text-amber-800"
        />
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[#E2E8F0] pt-5">
        <button
          type="button"
          onClick={onDetails}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-[#2563EB] hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB]"
        >
          <ArrowDownToLine size={16} aria-hidden="true" />
          Xem chi tiết
        </button>
        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={busy || Boolean(exitDirection)}
            onClick={() => completeSwipe("ignore")}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#CBD5E1] px-4 text-sm font-semibold text-[#475569] transition hover:bg-[#F8FAFC] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <ThumbsDown size={17} aria-hidden="true" />
            Bỏ qua
          </button>
          <button
            type="button"
            disabled={busy || Boolean(exitDirection)}
            onClick={() => completeSwipe("interest")}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#2563EB] px-4 text-sm font-semibold text-white transition hover:bg-[#1D4ED8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Heart size={17} aria-hidden="true" />
            Quan tâm
          </button>
        </div>
      </div>
      <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-[#64748B]">
        <MousePointer2 size={14} aria-hidden="true" />
        Vuốt hoặc dùng phím mũi tên để chọn
      </p>
    </article>
  );
}
