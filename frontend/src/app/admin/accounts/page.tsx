"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Bookmark,
  EyeOff,
  Ban,
  Shield,
  User,
  LoaderCircle,
  Users,
  AlertCircle,
  Calendar,
} from "lucide-react";
import { authenticatedRequest } from "@/lib/authenticatedRequest";
import { Select } from "@/components/ui/select";
import { PaginationCard } from "@/components/common/PaginationCard";
import { ToastNotice } from "@/components/ui/toast-notice";
import { AdminBanAccountModal } from "@/components/admin/AdminBanAccountModal";
import type { AccountView } from "@/type/auth";
import type { PageResponse } from "@/type/job";

type RoleOption = { id: string; name: string };

function formatDate(isoString: string | null): string {
  if (!isoString) return "—";
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  } catch {
    return isoString;
  }
}

export default function AdminAccountsPage() {
  const router = useRouter();

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [roleId, setRoleId] = useState("");
  const [roles, setRoles] = useState<RoleOption[]>([]);

  // Pagination & Data State
  const [page, setPage] = useState(0);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [accounts, setAccounts] = useState<AccountView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Current logged in user email to prevent self-banning
  const [currentEmail, setCurrentEmail] = useState("");

  // Ban Modal State
  const [accountToBan, setAccountToBan] = useState<AccountView | null>(null);

  useEffect(() => {
    setCurrentEmail(window.localStorage.getItem("accountEmail") ?? "");
  }, []);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(0);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Load roles for filter dropdown
  useEffect(() => {
    const token = window.localStorage.getItem("accessToken");
    if (!token) return;

    authenticatedRequest<RoleOption[]>("/api/roles", token)
      .then((data) => {
        if (Array.isArray(data)) {
          setRoles(data);
        }
      })
      .catch(() => {
        // Fallback silently if roles endpoint fails
      });
  }, []);

  // Load accounts list
  const loadAccounts = useCallback(
    async (currentPage: number, search: string, currentRoleId: string) => {
      const token = window.localStorage.getItem("accessToken");
      if (!token) {
        router.replace("/login");
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          page: String(currentPage),
          size: String(pageSize),
          sort: "createdAt,desc",
        });

        if (search.trim()) {
          params.set("search", search.trim());
        }
        if (currentRoleId) {
          params.set("roleId", currentRoleId);
        }

        const data = await authenticatedRequest<PageResponse<AccountView>>(
          `/api/admin/accounts?${params.toString()}`,
          token,
          { fallbackMessage: "Không thể tải danh sách tài khoản." },
        );

        setAccounts(data.content || []);
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
            : "Đã xảy ra lỗi khi tải danh sách tài khoản.",
        );
      } finally {
        setLoading(false);
      }
    },
    [pageSize, router],
  );

  useEffect(() => {
    void loadAccounts(page, debouncedSearch, roleId);
  }, [page, debouncedSearch, roleId, loadAccounts]);

  function handleBanSuccess(bannedAccountId: string) {
    setNotice("Đã khóa tài khoản thành công và gửi email thông báo tới người dùng.");
    setAccounts((current) => current.filter((acc) => acc.id !== bannedAccountId));
    setTotalElements((current) => Math.max(0, current - 1));
  }

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      {notice && (
        <ToastNotice
          kind="success"
          message={notice}
        />
      )}

      <section className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-sm">
        {/* Page Header */}
        <div className="border-b border-[#E2E8F0] p-5 sm:p-6">
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-bold tracking-tight text-[#0F172A] sm:text-2xl">
              Quản lý tài khoản
            </h1>
            <p className="text-sm text-[#64748B]">
              Danh sách tài khoản người dùng và quản trị viên trong hệ thống Matchob.
            </p>
          </div>

          {/* Filter Bar */}
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-lg">
              <span className="sr-only">Tìm kiếm theo email</span>
              <Search
                size={16}
                className="absolute left-3.5 top-3 text-[#94A3B8]"
              />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm kiếm theo email tài khoản…"
                className="h-10 w-full rounded-xl border border-[#CBD5E1] bg-white pl-10 pr-3.5 text-sm text-[#0F172A] outline-none transition placeholder:text-[#94A3B8] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10"
              />
            </div>

            {roles.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#64748B] shrink-0">
                  Vai trò:
                </span>
                <Select
                  options={roles}
                  selectedId={roleId}
                  onChange={(id) => {
                    setRoleId(id);
                    setPage(0);
                  }}
                  placeholder="Tất cả vai trò"
                  emptyMessage="Không có vai trò nào."
                  clearLabel="Tất cả vai trò"
                  ariaLabel="Lọc theo vai trò"
                  triggerClassName="min-w-[170px]"
                />
              </div>
            )}
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
                  Tài khoản (Email)
                </th>
                <th scope="col" className="px-4 py-3.5 whitespace-nowrap">
                  Vai trò
                </th>
                <th scope="col" className="px-4 py-3.5 whitespace-nowrap">
                  Ngày tạo
                </th>
                <th scope="col" className="px-5 py-3.5 whitespace-nowrap">
                  Hoạt động / Tương tác
                </th>
                <th scope="col" className="px-5 py-3.5 text-right whitespace-nowrap">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-[#64748B]">
                    <div className="flex flex-col items-center justify-center gap-2.5">
                      <LoaderCircle className="size-7 animate-spin text-[#2563EB]" />
                      <span className="text-sm font-medium">Đang tải danh sách tài khoản…</span>
                    </div>
                  </td>
                </tr>
              ) : accounts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-[#64748B]">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Users className="size-10 text-[#94A3B8]" />
                      <p className="text-base font-semibold text-[#0F172A]">
                        Không tìm thấy tài khoản nào
                      </p>
                      <p className="text-xs text-[#64748B]">
                        Hãy thử điều chỉnh từ khóa tìm kiếm hoặc bỏ chọn bộ lọc vai trò.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                accounts.map((account) => {
                  const roleName = account.role?.toLowerCase() ?? "";
                  const isAdmin = roleName === "admin";
                  const isCurrentAccount =
                    currentEmail && account.email?.toLowerCase() === currentEmail.toLowerCase();
                  const canBan = !isAdmin && !isCurrentAccount;

                  return (
                    <tr
                      key={account.id}
                      className="transition-colors hover:bg-[#F8FAFC]"
                    >
                      {/* Email (Clean: NO [u] or [a] tags as requested) */}
                      <td className="px-5 py-4">
                        <span className="font-semibold text-[#0F172A]">
                          {account.email}
                        </span>
                        {isCurrentAccount && (
                          <span className="ml-2 inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
                            (Bạn)
                          </span>
                        )}
                      </td>

                      {/* Role Badge */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        {isAdmin ? (
                          <span className="inline-flex items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50 px-2.5 py-1 text-xs font-semibold text-purple-700">
                            <Shield size={13} />
                            Admin
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700">
                            <User size={13} />
                            User
                          </span>
                        )}
                      </td>

                      {/* Created Date */}
                      <td className="px-4 py-4 whitespace-nowrap text-xs text-[#475569]">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={13} className="text-[#94A3B8]" />
                          {formatDate(account.createdAt)}
                        </div>
                      </td>

                      {/* Interactions */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        {isAdmin ? (
                          <span className="text-xs text-[#94A3B8]">—</span>
                        ) : (
                          <div className="flex flex-col gap-1 text-xs">
                            <span className="inline-flex items-center gap-1.5 font-medium text-[#2563EB]">
                              <Bookmark size={13} className="shrink-0" />
                              {account.interestedJobCount || 0} việc quan tâm
                            </span>
                            <span className="inline-flex items-center gap-1.5 font-medium text-[#94A3B8]">
                              <EyeOff size={13} className="shrink-0" />
                              {account.ignoredJobCount || 0} việc bỏ qua
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Actions (Ban button) */}
                      <td className="px-5 py-4 text-right whitespace-nowrap">
                        {canBan ? (
                          <button
                            type="button"
                            onClick={() => setAccountToBan(account)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50/50 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-100 hover:text-red-700 shadow-sm"
                          >
                            <Ban size={14} />
                            Khóa
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled
                            title={
                              isAdmin
                                ? "Không thể khóa tài khoản quản trị viên"
                                : "Không thể tự khóa tài khoản của chính bạn"
                            }
                            className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-1.5 text-xs font-medium text-[#94A3B8] opacity-60"
                          >
                            <Ban size={14} />
                            Khóa
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer & Pagination */}
        {!loading && accounts.length > 0 && (
          <div className="flex flex-col items-center justify-between gap-4 border-t border-[#E2E8F0] px-5 py-3 sm:flex-row">
            <p className="text-xs font-medium text-[#64748B]">
              Hiển thị {accounts.length} / {totalElements} tài khoản (Trang {page + 1}/{totalPages})
            </p>

            <PaginationCard
              currentPage={page}
              totalPages={totalPages}
              onPageChange={(newPage) => setPage(newPage)}
            />
          </div>
        )}
      </section>

      {/* Confirmation Modal */}
      {accountToBan && (
        <AdminBanAccountModal
          account={accountToBan}
          onClose={() => setAccountToBan(null)}
          onSuccess={handleBanSuccess}
        />
      )}
    </div>
  );
}
