"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, LoaderCircle, X, PlusCircle } from "lucide-react";
import { authenticatedRequest } from "@/lib/authenticatedRequest";
import { Select } from "@/components/ui/select";
import type { CanonicalItemView, CanonicalKind, CanonicalUpdateRequest } from "@/type/canonical";

type AdminCanonicalCreateModalProps = {
  isOpen: boolean;
  defaultType: CanonicalKind;
  onClose: () => void;
  onSuccess: (created: CanonicalItemView) => void;
};

const CATEGORY_OPTIONS = [
  { id: "skill", name: "Kỹ năng" },
  { id: "position", name: "Vị trí" },
  { id: "location", name: "Địa điểm" },
  { id: "work-mode", name: "Hình thức làm việc" },
];

export function AdminCanonicalCreateModal({
  isOpen,
  defaultType,
  onClose,
  onSuccess,
}: AdminCanonicalCreateModalProps) {
  const [name, setName] = useState("");
  const [targetType, setTargetType] = useState<CanonicalKind>(defaultType);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setName("");
      setTargetType(defaultType);
      setIsDuplicate(false);
      setError(null);
    }
  }, [isOpen, defaultType]);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    inputRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !saving) {
        event.preventDefault();
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, saving, onClose]);

  // Check duplicate when name or targetType changes
  useEffect(() => {
    const trimmed = name.trim();
    if (!isOpen || !trimmed) {
      setIsDuplicate(false);
      return;
    }

    const token = window.localStorage.getItem("accessToken");
    if (!token) return;

    setCheckingDuplicate(true);
    const handler = setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          type: targetType,
          name: trimmed,
        });

        const exists = await authenticatedRequest<boolean>(
          `/api/admin/canonical/check-duplicate?${params.toString()}`,
          token,
        );
        setIsDuplicate(Boolean(exists));
      } catch {
        // Ignore check failure
      } finally {
        setCheckingDuplicate(false);
      }
    }, 250);

    return () => clearTimeout(handler);
  }, [name, targetType, isOpen]);

  if (!isOpen) return null;

  const trimmed = name.trim();
  const canSave = trimmed.length > 0 && !isDuplicate && !checkingDuplicate && !saving;

  async function handleCreate() {
    if (!canSave) return;
    const token = window.localStorage.getItem("accessToken");
    if (!token) return;

    setSaving(true);
    setError(null);

    try {
      const payload: CanonicalUpdateRequest = {
        name: trimmed,
        targetType,
      };

      const created = await authenticatedRequest<CanonicalItemView>(
        "/api/admin/canonical",
        token,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          fallbackMessage: "Không thể thêm danh mục chuẩn mới.",
        },
      );

      onSuccess(created);
      onClose();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Đã xảy ra lỗi khi tạo danh mục chuẩn.",
      );
    } finally {
      setSaving(false);
    }
  }

  const selectedCategoryLabel =
    CATEGORY_OPTIONS.find((c) => c.id === targetType)?.name ?? "danh mục";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-canonical-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
    >
      <div
        className="fixed inset-0 bg-[#0F172A]/50 backdrop-blur-sm transition-opacity"
        onClick={() => {
          if (!saving) onClose();
        }}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex size-11 items-center justify-center rounded-xl bg-blue-50 text-[#2563EB]">
            <PlusCircle size={22} />
          </div>

          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            aria-label="Đóng"
            className="rounded-lg p-1.5 text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A] transition disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <div>
            <h2 id="create-canonical-title" className="text-lg font-bold text-[#0F172A]">
              Thêm danh mục chuẩn mới
            </h2>
            <p className="mt-1 text-xs text-[#64748B]">
              Tạo mới một giá trị danh mục chuẩn hóa trong hệ thống.
            </p>
          </div>

          {/* Select Category Type */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-[#475569]">
              Loại danh mục
            </label>
            <Select
              options={CATEGORY_OPTIONS}
              selectedId={targetType}
              onChange={(id) => setTargetType(id as CanonicalKind)}
              placeholder="Chọn loại danh mục"
              emptyMessage="Không tìm thấy loại."
              ariaLabel="Loại danh mục"
              triggerClassName="w-full"
            />
          </div>

          {/* Canonical Name Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-[#475569]">
              Tên danh mục chuẩn
            </label>
            <div className="relative">
              <input
                ref={inputRef}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ví dụ: Java, Frontend Developer, Hà Nội…"
                className={`h-10 w-full rounded-xl border bg-white px-3.5 text-sm text-[#0F172A] outline-none transition placeholder:text-[#94A3B8] ${
                  isDuplicate
                    ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100"
                    : "border-[#CBD5E1] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10"
                }`}
              />
              {checkingDuplicate && (
                <div className="absolute right-3 top-2.5">
                  <LoaderCircle size={18} className="animate-spin text-[#94A3B8]" />
                </div>
              )}
            </div>

            {isDuplicate && (
              <p className="flex items-center gap-1.5 text-xs font-medium text-red-600">
                <AlertCircle size={14} className="shrink-0" />
                Tên danh mục này đã tồn tại trong nhóm {selectedCategoryLabel}.
              </p>
            )}
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700">
              {error}
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-[#CBD5E1] bg-white px-4 text-sm font-semibold text-[#475569] shadow-sm transition hover:bg-[#F8FAFC] disabled:opacity-50"
          >
            Hủy bỏ
          </button>

          <button
            type="button"
            disabled={!canSave}
            onClick={() => void handleCreate()}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? (
              <>
                <LoaderCircle size={16} className="animate-spin" />
                Đang tạo…
              </>
            ) : (
              "Thêm danh mục"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
