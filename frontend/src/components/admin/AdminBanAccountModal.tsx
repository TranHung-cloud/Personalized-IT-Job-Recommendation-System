"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, LoaderCircle, X, ShieldAlert } from "lucide-react";
import { authenticatedRequest } from "@/lib/authenticatedRequest";
import type { AccountView } from "@/type/auth";

type AdminBanAccountModalProps = {
  account: AccountView | null;
  onClose: () => void;
  onSuccess: (accountId: string) => void;
};

export function AdminBanAccountModal({
  account,
  onClose,
  onSuccess,
}: AdminBanAccountModalProps) {
  const [banning, setBanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!account) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    cancelButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !banning) {
        event.preventDefault();
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [account, banning, onClose]);

  if (!account) return null;

  async function handleConfirmBan() {
    if (!account) return;
    const token = window.localStorage.getItem("accessToken");
    if (!token) return;

    setBanning(true);
    setError(null);

    try {
      await authenticatedRequest<void>(
        `/api/admin/accounts/${account.id}/ban`,
        token,
        {
          method: "POST",
          fallbackMessage: "Không thể khóa tài khoản. Vui lòng thử lại sau.",
        },
      );
      onSuccess(account.id);
      onClose();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Đã xảy ra lỗi khi khóa tài khoản.",
      );
    } finally {
      setBanning(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ban-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#0F172A]/50 backdrop-blur-sm transition-opacity"
        onClick={() => {
          if (!banning) onClose();
        }}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex size-11 items-center justify-center rounded-xl bg-red-50 text-red-600">
            <ShieldAlert size={24} />
          </div>

          <button
            type="button"
            disabled={banning}
            onClick={onClose}
            aria-label="Đóng"
            className="rounded-lg p-1.5 text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A] transition disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-4">
          <h2
            id="ban-modal-title"
            className="text-lg font-bold text-[#0F172A]"
          >
            Xác nhận khóa tài khoản
          </h2>

          <p className="mt-2 text-sm text-[#475569]">
            Bạn có chắc chắn muốn khóa tài khoản{" "}
            <strong className="text-[#0F172A] break-all">{account.email}</strong>?
          </p>

          <div className="mt-3.5 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-600" />
            <p className="leading-relaxed">
              Tài khoản này sẽ bị vô hiệu hóa ngay lập tức và một email thông báo sẽ được gửi tự động tới địa chỉ email của người dùng.
            </p>
          </div>

          {error && (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700">
              {error}
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            ref={cancelButtonRef}
            type="button"
            disabled={banning}
            onClick={onClose}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-[#CBD5E1] bg-white px-4 text-sm font-semibold text-[#475569] shadow-sm transition hover:bg-[#F8FAFC] disabled:opacity-50"
          >
            Hủy bỏ
          </button>

          <button
            type="button"
            disabled={banning}
            onClick={() => void handleConfirmBan()}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:opacity-60"
          >
            {banning ? (
              <>
                <LoaderCircle size={16} className="animate-spin" />
                Đang khóa & gửi email…
              </>
            ) : (
              "Xác nhận khóa & Gửi email"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
