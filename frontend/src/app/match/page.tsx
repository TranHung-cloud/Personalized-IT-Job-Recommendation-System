"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { BriefcaseBusiness, RotateCcw, UserRound } from "lucide-react";
import { MatchCard } from "@/components/match/MatchCard";
import { useMatch } from "@/hook/useMatch";
import { useProfile } from "@/hook/useProfile";
import type { MatchAction, MatchingView } from "@/type/match";
import { ToastNotice } from "@/components/ui/toast-notice";

type ProfileState = "loading" | "missing" | "ready" | "error";
type UndoRecord = { job: MatchingView; action: MatchAction };

const PREFETCH_THRESHOLD = 5;

function mergeMissingProfileFields(current: string[], incoming: string[]) {
  return [...new Set([...current, ...incoming])];
}

function isInteractiveTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    Boolean(
      target.closest(
        "button, a, input, select, textarea, [contenteditable='true']",
      ),
    )
  );
}

export default function MatchPage() {
  const { hasProfile } = useProfile();
  const { getMatches, saveInteraction, undoInteraction } = useMatch();
  const [profileState, setProfileState] = useState<ProfileState>("loading");
  const [matches, setMatches] = useState<MatchingView[]>([]);
  const [missingProfileFields, setMissingProfileFields] = useState<string[]>(
    [],
  );
  const [busy, setBusy] = useState(false);
  const [exitDirection, setExitDirection] = useState<MatchAction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [prefetchError, setPrefetchError] = useState<string | null>(null);
  const [undoRecord, setUndoRecord] = useState<UndoRecord | null>(null);
  const [matchesExhausted, setMatchesExhausted] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const interactionInFlight = useRef(false);
  const prefetchInFlight = useRef(false);
  const prefetchAttempted = useRef(false);
  const prefetchFailed = useRef(false);
  const failedPrefetchExclusions = useRef<string[] | null>(null);
  const seenJobIds = useRef(new Set<string>());
  const popupOpen = false;
  const [toastMessage, setToastMessage] = useState("");

  const endSession = useCallback(() => {
    window.localStorage.removeItem("accessToken");
    window.localStorage.removeItem("accountRole");
    window.localStorage.removeItem("accountEmail");
    window.location.assign("/login");
  }, []);

  const loadMatches = useCallback(async () => {
    setProfileState("loading");
    setError(null);
    setPrefetchError(null);
    setUndoRecord(null);
    setMatchesExhausted(false);
    prefetchAttempted.current = false;
    prefetchFailed.current = false;
    failedPrefetchExclusions.current = null;
    const token = window.localStorage.getItem("accessToken");
    if (!token) {
      endSession();
      return;
    }

    try {
      const exists = await hasProfile(token);
      if (!exists) {
        setProfileState("missing");
        setMatches([]);
        return;
      }

      const response = await getMatches(token);
      seenJobIds.current = new Set(
        response.matches.map((match) => match.jobId),
      );
      setMatches(response.matches);
      setMissingProfileFields(response.missingProfileFields);
      setMatchesExhausted(response.matches.length === 0);
      setProfileState("ready");
    } catch (cause: unknown) {
      if (cause instanceof Error && cause.message === "SESSION_EXPIRED") {
        endSession();
        return;
      }
      setProfileState("error");
      setError(
        cause instanceof Error
          ? cause.message
          : "Không thể tải việc làm phù hợp.",
      );
    }
  }, [endSession, getMatches, hasProfile]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadMatches();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadMatches, reloadKey]);

  const prefetchMatches = useCallback(
    async (retry = false) => {
      if (
        prefetchInFlight.current ||
        prefetchAttempted.current ||
        matchesExhausted
      )
        return;

      const unhandledMatches = matches.slice(0, PREFETCH_THRESHOLD);
      const excludeJobIds = retry
        ? failedPrefetchExclusions.current
        : unhandledMatches.map((match) => match.jobId);
      const token = window.localStorage.getItem("accessToken");
      if (!token || !excludeJobIds?.length) return;

      prefetchInFlight.current = true;
      prefetchAttempted.current = true;
      setPrefetchError(null);
      try {
        const response = await getMatches(token, excludeJobIds);
        const newMatches = response.matches.filter(
          (match) => !seenJobIds.current.has(match.jobId),
        );
        newMatches.forEach((match) => seenJobIds.current.add(match.jobId));
        setMatches((current) => [...current, ...newMatches]);
        setMissingProfileFields((current) =>
          mergeMissingProfileFields(current, response.missingProfileFields),
        );
        setMatchesExhausted(response.matches.length === 0);
        failedPrefetchExclusions.current = null;
        if (response.matches.length > 0) prefetchAttempted.current = false;
      } catch (cause: unknown) {
        if (cause instanceof Error && cause.message === "SESSION_EXPIRED") {
          endSession();
          return;
        }
        prefetchAttempted.current = false;
        prefetchFailed.current = true;
        failedPrefetchExclusions.current = excludeJobIds;
        setPrefetchError(
          cause instanceof Error
            ? cause.message
            : "Không thể tải thêm việc làm. Vui lòng thử lại.",
        );
      } finally {
        prefetchInFlight.current = false;
      }
    },
    [endSession, getMatches, matches, matchesExhausted],
  );

  useEffect(() => {
    if (
      matches.length > 0 &&
      matches.length <= PREFETCH_THRESHOLD &&
      !prefetchAttempted.current &&
      !prefetchFailed.current &&
      !matchesExhausted
    ) {
      void prefetchMatches();
    }
  }, [matches.length, matchesExhausted, prefetchMatches]);

  const retryPrefetch = useCallback(() => {
    prefetchFailed.current = false;
    void prefetchMatches(true);
  }, [prefetchMatches]);

  const handleDecision = useCallback(
    async (action: MatchAction) => {
      const activeMatch = matches[0];
      const token = window.localStorage.getItem("accessToken");
      if (
        !activeMatch ||
        !token ||
        busy ||
        exitDirection ||
        interactionInFlight.current
      )
        return;

      interactionInFlight.current = true;
      setBusy(true);
      setError(null);
      let interactionSaved = false;
      try {
        await saveInteraction(token, activeMatch.jobId, action);
        interactionSaved = true;
        setUndoRecord({ job: activeMatch, action });
        setToastMessage(
          action === "interest"
            ? `Đã quan tâm: ${activeMatch.jobTitle}`
            : `Đã bỏ qua: ${activeMatch.jobTitle}`,
        );
        setExitDirection(action);
      } catch (cause: unknown) {
        if (cause instanceof Error && cause.message === "SESSION_EXPIRED") {
          endSession();
          return;
        }
        setError(
          cause instanceof Error
            ? cause.message
            : "Không thể lưu lựa chọn. Vui lòng thử lại.",
        );
      } finally {
        setBusy(false);
        if (!interactionSaved) interactionInFlight.current = false;
      }
    },
    [busy, endSession, exitDirection, matches, saveInteraction],
  );

  const advanceCard = useCallback(() => {
    setMatches((current) => current.slice(1));
    setExitDirection(null);
    interactionInFlight.current = false;
  }, []);

  const handleUndo = useCallback(async () => {
    const token = window.localStorage.getItem("accessToken");
    if (
      !undoRecord ||
      !token ||
      busy ||
      exitDirection ||
      interactionInFlight.current
    )
      return;

    interactionInFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      const response = await undoInteraction(token, undoRecord.job.jobId);
      if (response.jobStillEligible) {
        setMatches((current) => {
          if (current.some((match) => match.jobId === undoRecord.job.jobId))
            return current;
          return [undoRecord.job, ...current];
        });
      }
      setUndoRecord(null);
      setToastMessage("");
    } catch (cause: unknown) {
      if (cause instanceof Error && cause.message === "SESSION_EXPIRED") {
        endSession();
        return;
      }
      setError(
        cause instanceof Error
          ? cause.message
          : "Không thể hoàn tác lựa chọn. Vui lòng thử lại.",
      );
    } finally {
      setBusy(false);
      interactionInFlight.current = false;
    }
  }, [busy, endSession, exitDirection, undoInteraction, undoRecord]);

  const handleDetails = useCallback(() => {
    // The details popup is implemented only after its layout review.
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (popupOpen || isInteractiveTarget(event.target)) return;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        void handleDecision("ignore");
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        void handleDecision("interest");
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleDecision, popupOpen]);

  if (profileState === "loading") {
    return (
      <div
        role="status"
        className="grid min-h-64 place-items-center rounded-2xl border border-[#E2E8F0] bg-white text-sm text-[#64748B]"
      >
        Đang tải việc làm phù hợp…
      </div>
    );
  }

  if (profileState === "missing") {
    return (
      <section className="grid min-h-[min(620px,calc(100vh-9rem))] place-items-center rounded-2xl border border-dashed border-[#CBD5E1] bg-white px-6 py-12 text-center">
        <div className="max-w-md">
          <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-blue-50 text-[#2563EB]">
            <UserRound size={28} aria-hidden="true" />
          </span>
          <h2 className="mt-5 text-xl font-bold tracking-tight text-[#0F172A]">
            Tạo hồ sơ để xem gợi ý
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#64748B]">
            Hồ sơ giúp chúng tôi chọn các công việc phù hợp với bạn.
          </p>
          <Link
            href="/profile"
            className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#2563EB] px-5 text-sm font-semibold text-white transition hover:bg-[#1D4ED8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB]"
          >
            <BriefcaseBusiness size={16} aria-hidden="true" />
            Tạo hồ sơ
          </Link>
        </div>
      </section>
    );
  }

  if (profileState === "error") {
    return (
      <div
        role="alert"
        className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800"
      >
        <p>{error}</p>
        <button
          type="button"
          onClick={() => setReloadKey((key) => key + 1)}
          className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-lg border border-red-300 px-3 font-semibold hover:bg-red-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
        >
          <RotateCcw size={16} aria-hidden="true" />
          Thử tải lại
        </button>
      </div>
    );
  }

  const activeMatch = matches[0];
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header className="rounded-2xl border border-[#E2E8F0] bg-white p-5 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#2563EB]">
          Khám phá việc làm
        </p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight text-[#0F172A]">
          Công việc dành cho bạn
        </h2>
        <p className="mt-1 text-sm text-[#64748B]">
          Chọn quan tâm hoặc bỏ qua để tinh chỉnh gợi ý.
        </p>
      </header>

      {missingProfileFields.length > 0 && (
        <aside className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <span className="font-semibold">
            Bổ sung hồ sơ để gợi ý chính xác hơn:{" "}
          </span>
          {missingProfileFields.join(", ")}
          <Link
            href="/profile"
            className="ml-2 font-semibold underline underline-offset-2"
          >
            Cập nhật hồ sơ
          </Link>
        </aside>
      )}

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {error}
        </div>
      )}

      {prefetchError && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          <span>{prefetchError}</span>
          <button
            type="button"
            onClick={retryPrefetch}
            className="inline-flex min-h-10 items-center rounded-lg border border-amber-300 px-3 font-semibold hover:bg-amber-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700"
          >
            Thử tải thêm
          </button>
        </div>
      )}

      {undoRecord && (
        <ToastNotice
          kind="info"
          message={toastMessage}
          actionLabel="Hoàn tác"
          onAction={() => void handleUndo()}
        />
      )}

      {activeMatch ? (
        <MatchCard
          key={activeMatch.jobId}
          match={activeMatch}
          busy={busy}
          exitDirection={exitDirection}
          onIgnore={() => void handleDecision("ignore")}
          onInterest={() => void handleDecision("interest")}
          onDetails={handleDetails}
          onExitComplete={advanceCard}
        />
      ) : (
        <section className="grid min-h-72 place-items-center rounded-2xl border border-dashed border-[#CBD5E1] bg-white px-6 py-12 text-center">
          <div className="max-w-sm">
            <BriefcaseBusiness
              className="mx-auto text-[#2563EB]"
              size={34}
              aria-hidden="true"
            />
            <h2 className="mt-4 text-lg font-bold text-[#0F172A]">
              {matchesExhausted
                ? "Bạn đã xem hết gợi ý"
                : "Đang tìm thêm gợi ý"}
            </h2>
            <p className="mt-2 text-sm text-[#64748B]">
              {matchesExhausted
                ? "Hãy quay lại sau khi có thêm việc làm mới."
                : "Thử tải thêm để tiếp tục khám phá các công việc phù hợp."}
            </p>
            {!matchesExhausted && prefetchError && (
              <button
                type="button"
                onClick={retryPrefetch}
                className="mt-5 inline-flex min-h-10 items-center rounded-lg border border-[#CBD5E1] px-3 text-sm font-semibold text-[#475569] hover:bg-[#F8FAFC] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB]"
              >
                Thử tải thêm
              </button>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
