"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, LoaderCircle, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { authenticatedRequest } from "@/lib/authenticatedRequest";
import { ToastNotice } from "@/components/ui/toast-notice";
import { SearchableSelect } from "@/components/ui/searchableSelect";
import { Select } from "@/components/ui/select";

type Option = { id: string; name: string };
type RawRow = {
  rawName: string;
  rawCount: number;
  status: string;
  canonical: Option | null;
};
type PageData = {
  content: RawRow[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
};
type RawKind = "skill" | "position" | "location" | "work-mode";
type RawConfig = {
  label: string;
  endpoint: string;
  optionsEndpoint: string;
  canonicalParam: string;
};

const RAW_TYPES: Record<RawKind, RawConfig> = {
  skill: {
    label: "Kỹ năng",
    endpoint: "/api/admin/skill-raws",
    optionsEndpoint: "/api/skills",
    canonicalParam: "skillId",
  },
  position: {
    label: "Vị trí",
    endpoint: "/api/admin/position-raws",
    optionsEndpoint: "/api/positions",
    canonicalParam: "positionId",
  },
  location: {
    label: "Địa điểm",
    endpoint: "/api/admin/location-raws",
    optionsEndpoint: "/api/locations",
    canonicalParam: "locationId",
  },
  "work-mode": {
    label: "Hình thức làm việc",
    endpoint: "/api/admin/work-mode-raws",
    optionsEndpoint: "/api/work-modes",
    canonicalParam: "workModeId",
  },
};

const RAW_KIND_OPTIONS: Option[] = Object.entries(RAW_TYPES).map(
  ([id, config]) => ({ id, name: config.label }),
);

const STATUS_OPTIONS: Option[] = [
  { id: "pending", name: "Chờ đối soát" },
  { id: "review", name: "Cần xem lại" },
  { id: "mapped", name: "Đã ghép" },
  { id: "ignored", name: "Đã bỏ qua" },
];

const STATUS_LABELS: Record<string, string> = {
  pending: "Chờ đối soát",
  review: "Cần xem lại",
  mapped: "Đã ghép",
  ignored: "Đã bỏ qua",
};

function CanonicalPicker({
  options,
  value,
  onChange,
  placeholder,
  clearLabel,
  ariaLabel,
}: {
  options: Option[];
  value: Option | null;
  onChange: (option: Option) => void;
  placeholder: string;
  clearLabel: string;
  ariaLabel: string;
}) {
  return (
    <SearchableSelect
      options={options}
      selectedId={value?.id ?? ""}
      onChange={(id) =>
        onChange(
          options.find((option) => option.id === id) ?? { id: "", name: "" },
        )
      }
      placeholder={placeholder}
      searchPlaceholder="Tìm danh mục chuẩn…"
      emptyMessage="Không tìm thấy danh mục chuẩn."
      clearLabel={clearLabel}
      ariaLabel={ariaLabel}
      triggerClassName="min-w-[220px]"
      zIndexClassName="z-40"
    />
  );
}

export default function AdminDataMatchingPage() {
  const router = useRouter();
  const [kind, setKind] = useState<RawKind>("skill");
  const [rows, setRows] = useState<RawRow[]>([]);
  const [options, setOptions] = useState<Option[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [rawSearch, setRawSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [canonicalFilter, setCanonicalFilter] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [changes, setChanges] = useState<Map<string, Option>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const PAGE_SIZE = 15;

  const load = useCallback(
    async (
      activeKind: RawKind,
      activePage: number,
      search: string,
      status: string,
      canonicalId: string,
    ) => {
      const token = window.localStorage.getItem("accessToken");
      if (!token) {
        router.replace("/login");
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const config = RAW_TYPES[activeKind];
        const params = new URLSearchParams({
          page: String(activePage),
          size: String(PAGE_SIZE),
          sort: "rawCount,desc",
        });
        if (search.trim()) params.set("rawName", search.trim());
        if (status) params.set("status", status);
        if (canonicalId) params.set(config.canonicalParam, canonicalId);
        const [data, canonicalOptions] = await Promise.all([
          authenticatedRequest<PageData>(
            `${config.endpoint}?${params.toString()}`,
            token,
          ),
          authenticatedRequest<Option[]>(config.optionsEndpoint, token),
        ]);
        setRows(data.content);
        setTotalPages(data.totalPages);
        setOptions(canonicalOptions);
        setSelected(new Set());
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
            : "Không thể tải dữ liệu đối soát.",
        );
      } finally {
        setLoading(false);
      }
    },
    [router],
  );

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void load(kind, page, rawSearch, statusFilter, canonicalFilter);
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [kind, page, rawSearch, statusFilter, canonicalFilter, load]);

  const saveCount = changes.size;
  const selectedOnPage =
    rows.length > 0 && rows.every((row) => selected.has(row.rawName));

  function changeKind(nextKind: RawKind) {
    setKind(nextKind);
    setPage(0);
    setCanonicalFilter("");
    setChanges(new Map());
    setNotice(null);
  }

  function setRowCanonical(rawName: string, option: Option) {
    const original =
      rows.find((row) => row.rawName === rawName)?.canonical ?? null;
    setChanges((current) => {
      const next = new Map(current);
      if (option.id && option.id === original?.id) {
        next.delete(rawName);
      } else if (option.id) {
        next.set(rawName, option);
      } else {
        next.delete(rawName);
      }
      return next;
    });
    setNotice(null);
  }

  async function saveChanges() {
    const token = window.localStorage.getItem("accessToken");
    if (!token || !changes.size) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      await authenticatedRequest<void>(
        `${RAW_TYPES[kind].endpoint}/match`,
        token,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            Array.from(changes, ([rawName, canonical]) => ({
              rawName,
              canonicalId: canonical.id,
            })),
          ),
        },
      );
      setChanges(new Map());
      setNotice(`Đã lưu ${saveCount} thay đổi.`);
      await load(kind, page, rawSearch, statusFilter, canonicalFilter);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Không thể lưu thay đổi.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function ignoreSelected() {
    const token = window.localStorage.getItem("accessToken");
    if (!token || !selected.size) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      await authenticatedRequest<void>(
        `${RAW_TYPES[kind].endpoint}/ignore`,
        token,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(Array.from(selected)),
        },
      );
      setNotice(`Đã bỏ qua ${selected.size} mục.`);
      await load(kind, page, rawSearch, statusFilter, canonicalFilter);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Không thể bỏ qua mục đã chọn.",
      );
    } finally {
      setSaving(false);
    }
  }

  function approveMatch(rawName: string) {
    const row = rows.find((item) => item.rawName === rawName);

    if (!row || row.status !== "review") return;

    const canonical = changes.get(rawName) ?? row.canonical;

    if (!canonical?.id) return;

    setChanges((current) => {
      const next = new Map(current);
      next.set(rawName, canonical);
      return next;
    });
  }

  return (
    <div className="mx-auto max-w-7xl">
      <section className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-sm">
        <div className="flex flex-col gap-5 border-b border-[#E2E8F0] p-4 sm:p-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0 flex-1 space-y-3">
            <div>
              <h2 className="text-xl font-bold tracking-tight">
                Đối soát dữ liệu thô
              </h2>
              <p className="mt-1 text-sm text-[#64748B]">
                Ghép các giá trị thu thập được với danh mục chuẩn.
              </p>
            </div>
            <label className="relative block max-w-3xl">
              <span className="sr-only">Tìm tên thô</span>
              <Search
                size={16}
                className="absolute left-3 top-3 text-[#94A3B8]"
              />
              <input
                value={rawSearch}
                onChange={(event) => {
                  setRawSearch(event.target.value);
                  setPage(0);
                }}
                placeholder="Tìm tên thô…"
                className="h-10 w-full rounded-lg border border-[#CBD5E1] pl-9 pr-3 text-sm outline-none focus:border-[#2563EB]"
              />
            </label>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-medium text-[#64748B]">Loại</span>
                <Select
                  options={RAW_KIND_OPTIONS}
                  selectedId={kind}
                  onChange={(id) => changeKind(id as RawKind)}
                  placeholder="Chọn loại dữ liệu"
                  emptyMessage="Không tìm thấy loại dữ liệu."
                  ariaLabel="Loại dữ liệu thô"
                  triggerClassName="min-w-[170px]"
                />
              </div>
              <span
                aria-hidden="true"
                className="h-6 border-l border-[#CBD5E1]"
              />
              <div className="flex items-center gap-2">
                <span className="font-medium text-[#64748B]">Trạng thái</span>
                <Select
                  options={STATUS_OPTIONS}
                  selectedId={statusFilter}
                  onChange={(id) => {
                    setStatusFilter(id);
                    setPage(0);
                  }}
                  placeholder="Mọi trạng thái"
                  emptyMessage="Không tìm thấy trạng thái."
                  clearLabel="Mọi trạng thái"
                  ariaLabel="Lọc theo trạng thái"
                  triggerClassName="min-w-[180px]"
                />
              </div>
              <span
                aria-hidden="true"
                className="h-6 border-l border-[#CBD5E1]"
              />
              <div className="flex items-center gap-2">
                <span className="font-medium text-[#64748B]">
                  Tên chuẩn hóa
                </span>
                <CanonicalPicker
                  options={options}
                  value={
                    options.find((option) => option.id === canonicalFilter) ??
                    null
                  }
                  placeholder="Mọi tên chuẩn hóa"
                  clearLabel="Mọi tên chuẩn hóa"
                  ariaLabel="Lọc theo canonical"
                  onChange={(option) => {
                    setCanonicalFilter(option.id);
                    setPage(0);
                  }}
                />
              </div>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2 xl:justify-end">
            <button
              type="button"
              disabled={saving || selected.size === 0}
              onClick={() => void ignoreSelected()}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-rose-200 px-4 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving && <LoaderCircle size={16} className="animate-spin" />} Bỏ
              qua ({selected.size})
            </button>
            <button
              type="button"
              disabled={saving || saveCount === 0}
              onClick={() => void saveChanges()}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#2563EB] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving && <LoaderCircle size={16} className="animate-spin" />}{" "}
              Lưu thay đổi ({saveCount})
            </button>
          </div>
        </div>

        {error && <ToastNotice kind="error" message={error} />}
        {notice && <ToastNotice kind="success" message={notice} />}

        <div className="overflow-x-auto border-x border-[#E2E8F0]">
          <table className="w-full min-w-[800px] table-fixed border-collapse text-sm">
            <colgroup>
              <col className="w-[56px]" />
              <col className="w-[25%]" />
              <col className="w-[27%]" />
              <col className="w-[15%]" />
              <col className="w-[150px]" />
              <col className="w-[120px]" />
            </colgroup>

            <thead className="bg-[#F8FAFC] text-xs font-semibold uppercase tracking-wide text-[#64748B]">
              <tr className="h-11 border-b border-[#E2E8F0]">
                <th className="text-center">
                  <input
                    type="checkbox"
                    aria-label="Chọn tất cả dòng"
                    checked={selectedOnPage}
                    onChange={(event) =>
                      setSelected(
                        event.target.checked
                          ? new Set(rows.map((row) => row.rawName))
                          : new Set(),
                      )
                    }
                    className="size-4 cursor-pointer accent-blue-600"
                  />
                </th>

                <th className="px-4 text-left">Tên thô</th>
                <th className="px-4 text-center">Tên chuẩn hóa</th>
                <th className="px-4 text-center">Trạng thái</th>
                <th className="px-4 text-center">Số lượng</th>
                <th className="px-4 text-center">Duyệt kết quả ghép</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#F1F5F9]">
              {loading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="h-48 text-center text-sm text-[#64748B]"
                  >
                    <span className="inline-flex items-center gap-2">
                      <LoaderCircle size={17} className="animate-spin" />
                      Đang tải dữ liệu…
                    </span>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="h-48 text-center text-sm text-[#64748B]"
                  >
                    Không có dữ liệu phù hợp.
                  </td>
                </tr>
              ) : (
                <>
                  {rows.map((row) => {
                    const canonical = changes.get(row.rawName) ?? row.canonical;

                    return (
                      <tr
                        key={row.rawName}
                        className={`h-[60px] transition-colors hover:bg-blue-50/40 ${
                          selected.has(row.rawName)
                            ? "bg-blue-50/50"
                            : "bg-white"
                        }`}
                      >
                        <td className="text-center">
                          <input
                            type="checkbox"
                            aria-label={`Chọn ${row.rawName}`}
                            checked={selected.has(row.rawName)}
                            onChange={(event) =>
                              setSelected((current) => {
                                const next = new Set(current);
                                if (event.target.checked) next.add(row.rawName);
                                else next.delete(row.rawName);
                                return next;
                              })
                            }
                            className="size-4 cursor-pointer accent-blue-600"
                          />
                        </td>

                        <td className="px-4">
                          <span
                            className="block truncate font-medium text-[#0F172A]"
                            title={row.rawName}
                          >
                            {row.rawName}
                          </span>
                        </td>

                        <td className="px-4 text-center">
                          <div className="mx-auto max-w-[280px]">
                            <CanonicalPicker
                              options={options}
                              value={canonical}
                              placeholder="Chọn danh mục chuẩn"
                              clearLabel="Bỏ chọn"
                              ariaLabel={`Danh mục chuẩn cho ${row.rawName}`}
                              onChange={(option) =>
                                setRowCanonical(row.rawName, option)
                              }
                            />
                          </div>
                        </td>

                        <td className="px-4 text-center">
                          <span
                            className={`inline-flex min-w-[90px] justify-center rounded-full px-3 py-1 text-xs font-semibold ${
                              row.status === "mapped"
                                ? "bg-emerald-50 text-emerald-700"
                                : row.status === "ignored"
                                  ? "bg-slate-100 text-slate-600"
                                  : row.status === "review"
                                    ? "bg-amber-50 text-amber-700"
                                    : "bg-blue-50 text-blue-700"
                            }`}
                          >
                            {STATUS_LABELS[row.status] ?? row.status}
                          </span>
                        </td>

                        <td className="px-4 text-center font-medium tabular-nums text-[#475569]">
                          {row.rawCount.toLocaleString("vi-VN")}
                        </td>

                        <td className="px-4 text-center">
                          {row.status === "review" ? (
                            changes.has(row.rawName) ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                                ✓ Đã duyệt
                              </span>
                            ) : (
                              <button
                                type="button"
                                disabled={!canonical?.id || saving}
                                onClick={() => approveMatch(row.rawName)}
                                className="inline-flex items-center justify-center rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                Duyệt
                              </button>
                            )
                          ) : (
                            <span className="text-xs text-[#94A3B8]">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}

                  {/* Các dòng trống để giữ chiều cao bảng cố định */}
                  {Array.from({ length: Math.max(0, 15 - rows.length) }).map(
                    (_, index) => (
                      <tr key={`empty-${index}`} className="h-[60px] bg-white">
                        <td colSpan={6}></td>
                      </tr>
                    ),
                  )}
                </>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E2E8F0] px-5 py-3 text-sm text-[#64748B]">
          <span>
            {totalPages > 0
              ? `Trang ${page + 1} / ${totalPages}`
              : "Không có kết quả"}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Trang trước"
              disabled={page <= 0 || loading}
              onClick={() => setPage((current) => Math.max(0, current - 1))}
              className="grid size-9 place-items-center rounded-lg border border-[#E2E8F0] hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft size={17} />
            </button>
            <button
              type="button"
              aria-label="Trang sau"
              disabled={page + 1 >= totalPages || loading}
              onClick={() => setPage((current) => current + 1)}
              className="grid size-9 place-items-center rounded-lg border border-[#E2E8F0] hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRight size={17} />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
