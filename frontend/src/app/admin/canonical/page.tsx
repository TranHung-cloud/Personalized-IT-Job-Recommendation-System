"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Trash2,
  FolderOpen,
  LoaderCircle,
  AlertCircle,
  Plus,
} from "lucide-react";
import { authenticatedRequest } from "@/lib/authenticatedRequest";
import { PaginationCard } from "@/components/common/PaginationCard";
import { ToastNotice } from "@/components/ui/toast-notice";
import { AdminCanonicalDeleteModal } from "@/components/admin/AdminCanonicalDeleteModal";
import { AdminCanonicalCreateModal } from "@/components/admin/AdminCanonicalCreateModal";
import type { CanonicalItemView, CanonicalKind } from "@/type/canonical";
import type { PageResponse } from "@/type/job";

const CATEGORY_TABS: { id: CanonicalKind; name: string }[] = [
  { id: "skill", name: "Kỹ năng" },
  { id: "position", name: "Vị trí" },
  { id: "location", name: "Địa điểm" },
  { id: "work-mode", name: "Hình thức làm việc" },
];

export default function AdminCanonicalPage() {
  const router = useRouter();

  // Active Category Type (default: skill, exactly ONE active at a time)
  const [activeType, setActiveType] = useState<CanonicalKind>("skill");

  // Search & Pagination State
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize] = useState(15);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  // Data State
  const [items, setItems] = useState<CanonicalItemView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deletingItem, setDeletingItem] = useState<CanonicalItemView | null>(
    null,
  );

  // Debounce search input
  useEffect(() => {
    const trimmedSearch = searchTerm.trim();

    if (trimmedSearch.length < 2) {
      setDebouncedSearch("");
      setPage(0);
      return;
    }

    const handler = setTimeout(() => {
      setDebouncedSearch(trimmedSearch);
      setPage(0);
    }, 300);

    return () => clearTimeout(handler);
  }, [searchTerm]);

  const loadItems = useCallback(
    async (type: CanonicalKind, currentPage: number, search: string) => {
      const token = window.localStorage.getItem("accessToken");
      if (!token) {
        router.replace("/login");
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          type,
          page: String(currentPage),
          size: String(pageSize),
        });

        if (search.trim()) {
          params.set("search", search.trim());
        }

        const data = await authenticatedRequest<
          PageResponse<CanonicalItemView>
        >(`/api/admin/canonical?${params.toString()}`, token, {
          fallbackMessage: "Không thể tải danh sách tên chuẩn hóa.",
        });

        setItems(data.content || []);
        setTotalPages(data.totalPages || 0);
        setTotalElements(data.totalElements || 0);
      } catch (cause) {
        if (cause instanceof Error && cause.message === "SESSION_EXPIRED") {
          window.localStorage.removeItem("accessToken");
          window.localStorage.removeItem("accountRole");
          window.localStorage.removeItem("accountEmail");
          router.replace("/login");
          return;
        }
        setError(
          cause instanceof Error
            ? cause.message
            : "Đã xảy ra lỗi khi tải tên chuẩn hóa.",
        );
      } finally {
        setLoading(false);
      }
    },
    [pageSize, router],
  );

  useEffect(() => {
    void loadItems(activeType, page, debouncedSearch);
  }, [activeType, page, debouncedSearch, loadItems]);

  function handleTypeChange(nextType: CanonicalKind) {
    if (nextType === activeType) return;
    setActiveType(nextType);
    setPage(0);
  }

  function handleCreateSuccess(created: CanonicalItemView) {
    setNotice(`Đã thêm tên chuẩn hóa "${created.name}" thành công.`);
    if (created.type === activeType) {
      setItems((current) => [created, ...current]);
      setTotalElements((current) => current + 1);
    } else {
      setActiveType(created.type);
      setPage(0);
    }
  }

  function handleDeleteSuccess(deletedId: string) {
    setNotice(
      "Đã xóa vĩnh viễn tên chuẩn hóa và toàn bộ dữ liệu thô liên kết.",
    );
    setItems((current) => current.filter((item) => item.id !== deletedId));
    setTotalElements((current) => Math.max(0, current - 1));
  }

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      {notice && <ToastNotice kind="success" message={notice} />}

      <section className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-sm">
        {/* Page Header */}
        <div className="border-b border-[#E2E8F0] p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-1">
              <h1 className="text-xl font-bold tracking-tight text-[#0F172A] sm:text-2xl">
                Quản lý tên chuẩn hóa
              </h1>
              <p className="text-sm text-[#64748B]">
                Quản lý các tên chuẩn hóa và các dữ liệu liên kết.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-[#2563EB] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 shrink-0 self-start sm:self-auto"
            >
              <Plus size={16} />
              Thêm tên chuẩn hóa
            </button>
          </div>

          {/* Filter Bar (Search + Category Type Selector) */}
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-lg">
              <span className="sr-only">Tìm kiếm tên tên chuẩn hóa</span>
              <Search
                size={16}
                className="absolute left-3.5 top-3 text-[#94A3B8]"
              />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm kiếm tên chuẩn hóa…"
                className="h-10 w-full rounded-xl border border-[#CBD5E1] bg-white pl-10 pr-3.5 text-sm text-[#0F172A] outline-none transition placeholder:text-[#94A3B8] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10"
              />
            </div>
          </div>

          {/* Quick Segmented Tabs */}
          <div className="mt-4 flex flex-wrap gap-1.5 border-t border-[#F1F5F9] pt-4">
            {CATEGORY_TABS.map((tab) => {
              const isActive = activeType === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleTypeChange(tab.id)}
                  className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition ${
                    isActive
                      ? "bg-[#2563EB] text-white shadow-sm"
                      : "bg-[#F1F5F9] text-[#475569] hover:bg-[#E2E8F0] hover:text-[#0F172A]"
                  }`}
                >
                  {tab.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="m-5 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle size={18} className="shrink-0" />
            <p className="font-medium">{error}</p>
          </div>
        )}

        {/* Content Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-xs font-bold uppercase tracking-wider text-[#64748B]">
              <tr>
                <th scope="col" className="px-5 py-3.5">
                  Tên chuẩn hóa
                </th>
                <th
                  scope="col"
                  className="px-4 py-3.5 text-center whitespace-nowrap"
                >
                  Việc làm liên kết
                </th>
                <th
                  scope="col"
                  className="px-4 py-3.5 text-center whitespace-nowrap"
                >
                  Dữ liệu thô
                </th>
                <th
                  scope="col"
                  className="px-5 py-3.5 text-right whitespace-nowrap"
                >
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-16 text-center text-[#64748B]">
                    <div className="flex flex-col items-center justify-center gap-2.5">
                      <LoaderCircle className="size-7 animate-spin text-[#2563EB]" />
                      <span className="text-sm font-medium">
                        Đang tải tên chuẩn hóa…
                      </span>
                    </div>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-16 text-center text-[#64748B]">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <FolderOpen className="size-10 text-[#94A3B8]" />
                      <p className="text-base font-semibold text-[#0F172A]">
                        Không tìm thấy tên chuẩn hóa nào
                      </p>
                      <p className="text-xs text-[#64748B]">
                        Hãy thử tìm kiếm với từ khóa khác hoặc chuyển sang loại
                        danh mục khác.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr
                    key={item.id}
                    className="transition-colors hover:bg-[#F8FAFC]"
                  >
                    {/* Canonical Name */}
                    <td className="px-5 py-4">
                      <span className="font-semibold text-[#0F172A]">
                        {item.name}
                      </span>
                    </td>

                    {/* Currently Linked Jobs (Numeric only) */}
                    <td className="px-4 py-4 text-center font-medium text-[#0F172A] whitespace-nowrap">
                      {item.jobCount}
                    </td>

                    {/* Linked Raw Data (Numeric only) */}
                    <td className="px-4 py-4 text-center font-medium text-[#0F172A] whitespace-nowrap">
                      {item.rawCount}
                    </td>

                    {/* Actions (Delete button) */}
                    <td className="px-5 py-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setDeletingItem(item)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50/50 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-100 hover:text-red-700 shadow-sm"
                      >
                        <Trash2 size={13} />
                        Xóa
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer & Pagination */}
        {!loading && items.length > 0 && (
          <div className="flex flex-col items-center justify-between gap-4 border-t border-[#E2E8F0] px-5 py-3 sm:flex-row">
            <p className="text-xs font-medium text-[#64748B]">
              Hiển thị {items.length} / {totalElements} tên chuẩn hóa (Trang{" "}
              {page + 1}/{totalPages})
            </p>

            <PaginationCard
              currentPage={page}
              totalPages={totalPages}
              onPageChange={(newPage) => setPage(newPage)}
            />
          </div>
        )}
      </section>

      {/* Create Modal */}
      <AdminCanonicalCreateModal
        isOpen={showCreateModal}
        defaultType={activeType}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleCreateSuccess}
      />

      {/* Delete Confirmation Modal */}
      {deletingItem && (
        <AdminCanonicalDeleteModal
          item={deletingItem}
          onClose={() => setDeletingItem(null)}
          onSuccess={handleDeleteSuccess}
        />
      )}
    </div>
  );
}
