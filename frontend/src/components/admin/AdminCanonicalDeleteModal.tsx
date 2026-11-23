"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, LoaderCircle, X, Trash2 } from "lucide-react";
import { authenticatedRequest } from "@/lib/authenticatedRequest";
import type { CanonicalItemView } from "@/type/canonical";

type AdminCanonicalDeleteModalProps = {
  item: CanonicalItemView | null;
  onClose: () => void;
  onSuccess: (deletedId: string) => void;
};

export function AdminCanonicalDeleteModal({
  item,
  onClose,
  onSuccess,
}: AdminCanonicalDeleteModalProps) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!item) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    cancelButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !deleting) {
        event.preventDefault();
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [item, deleting, onClose]);

  if (!item) return null;

  async function handleDelete() {
    if (!item) return;
    const token = window.localStorage.getItem("accessToken");
    if (!token) return;

    setDeleting(true);
    setError(null);

    try {
      await authenticatedRequest<void>(
        `/api/admin/canonical/${item.type}/${item.id}`,
        token,
        {
          method: "DELETE",
          fallbackMessage: "Không thể xóa danh mục chuẩn.",
        },
      );
      onSuccess(item.id);
      onClose();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Đã xảy ra lỗi khi xóa danh mục chuẩn.",
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-canonical-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
    >
      <div
        className="fixed inset-0 bg-[#0F172A]/50 backdrop-blur-sm transition-opacity"
        onClick={() => {
          if (!deleting) onClose();
        }}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex size-11 items-center justify-center rounded-xl bg-red-50 text-red-600">
            <Trash2 size={22} />
          </div>

          <button
            type="button"
            disabled={deleting}
            onClick={onClose}
            aria-label="Đóng"
            className="rounded-lg p-1.5 text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A] transition disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <h2 id="delete-canonical-title" className="text-lg font-bold text-[#0F172A]">
            Xác nhận xóa danh mục chuẩn
          </h2>

          <p className="text-sm text-[#475569]">
            Bạn có chắc chắn muốn xóa danh mục chuẩn{" "}
            <strong className="text-[#0F172A] break-all">{item.name}</strong> không?
          </p>

          <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-800 leading-relaxed space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-red-900">
              <AlertTriangle size={15} className="shrink-0 text-red-600" />
              CẢNH BÁO QUAN TRỌNG:
            </div>
            <p>
              Việc xóa danh mục chuẩn này sẽ <strong>ĐỒNG THỜI XÓA VĨNH VIỄN</strong> tất cả dữ liệu thô (raw data) đang được liên kết với danh mục này trong hệ thống. Thao tác này không thể hoàn tác!
            </p>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700">
              {error}
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            ref={cancelButtonRef}
            type="button"
            disabled={deleting}
            onClick={onClose}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-[#CBD5E1] bg-white px-4 text-sm font-semibold text-[#475569] shadow-sm transition hover:bg-[#F8FAFC] disabled:opacity-50"
          >
            Hủy bỏ
          </button>

          <button
            type="button"
            disabled={deleting}
            onClick={() => void handleDelete()}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:opacity-60"
          >
            {deleting ? (
              <>
                <LoaderCircle size={16} className="animate-spin" />
                Đang xóa vĩnh viễn…
              </>
            ) : (
              "Xác nhận xóa vĩnh viễn"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
