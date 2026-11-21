"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { SubmitEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  GraduationCap,
  Plus,
  X,
} from "lucide-react";
import { useCompanies } from "@/hook/useCompanies";
import { useProfile } from "@/hook/useProfile";
import { ToastNotice } from "@/components/ui/toast-notice";
import { SearchableSelect } from "@/components/ui/searchableSelect";
import { useDropdownPlacement } from "@/hook/useDropdownPlacement";
import type {
  DegreeInput,
  ProfileOnboardingOptions,
  ProfileOnboardingRequest,
  ProfileOption,
  WorkExperienceInput,
} from "@/type/profile";
import type { CompanySuggestion } from "@/type/company";
import { formatCurrency, parseCurrency } from "@/lib/formatCurrency";

type Props = {
  onSkip: () => void;
  onCompleted: () => void;
};

const EMPTY_OPTIONS: ProfileOnboardingOptions = {
  skills: [],
  positions: [],
  locations: [],
  workModes: [],
  qualifications: [],
};

export function OptionPicker({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: ProfileOption[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const inputId = useId();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const matchingOptions = options
    .filter(
      (option) =>
        !selected.includes(option.id) &&
        option.name
          .toLocaleLowerCase()
          .includes(query.trim().toLocaleLowerCase()),
    )
    .slice(0, 10);
  const { placement, maxHeight: listMaxHeight } = useDropdownPlacement(
    isOpen,
    inputRef,
    matchingOptions.length,
  );

  function select(id: string) {
    onChange([...selected, id]);
    setQuery("");
    setIsOpen(true);
  }

  function remove(id: string) {
    onChange(selected.filter((item) => item !== id));
  }

  return (
    <div className="space-y-2">
      <label
        htmlFor={inputId}
        className="block text-sm font-semibold text-[#334155]"
      >
        {label}
      </label>
      <div className="relative">
        <input
          ref={inputRef}
          id={inputId}
          type="search"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-controls={listId}
          autoComplete="off"
          value={query}
          onFocus={() => setIsOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              if (matchingOptions[0]) select(matchingOptions[0].id);
              setIsOpen(false);
            }
            if (event.key === "Escape") setIsOpen(false);
          }}
          onBlur={(event) => {
            if (
              !event.currentTarget.parentElement?.contains(event.relatedTarget)
            )
              setIsOpen(false);
          }}
          placeholder={`Tìm ${label.toLocaleLowerCase()}…`}
          className={fieldClass}
        />
        {isOpen && (
          <div
            id={listId}
            role="listbox"
            aria-label={`Kết quả ${label.toLocaleLowerCase()}`}
            style={{ maxHeight: `${listMaxHeight}px` }}
            className={`absolute inset-x-0 z-20 overflow-x-hidden overflow-y-auto rounded-xl border border-[#CBD5E1] bg-white p-1.5 shadow-lg ${placement === "above" ? "bottom-full mb-1" : "top-full mt-1"}`}
          >
            {matchingOptions.length > 0 ? (
              matchingOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  role="option"
                  aria-selected="false"
                  title={option.name}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    select(option.id);
                    setIsOpen(false);
                  }}
                  className="block min-h-10 w-full min-w-0 max-w-full overflow-hidden text-ellipsis whitespace-nowrap rounded-lg px-3 text-left text-sm text-[#334155] hover:bg-blue-50 hover:text-[#1D4ED8] focus-visible:bg-blue-50 focus-visible:outline-none"
                >
                  {option.name}
                </button>
              ))
            ) : (
              <p className="px-3 py-2 text-sm text-[#64748B]">
                {options.length
                  ? "Không tìm thấy kết quả phù hợp."
                  : "Chưa có lựa chọn."}
              </p>
            )}
          </div>
        )}
      </div>
      {selected.length > 0 && (
        <ul aria-label={`${label} đã chọn`} className="flex flex-wrap gap-2">
          {selected.map((id) => {
            const option = options.find((item) => item.id === id);
            if (!option) return null;
            return (
              <li
                key={id}
                className="inline-flex min-h-8 items-center gap-1 rounded-full border border-blue-200 bg-blue-50 pl-3 pr-1 text-sm text-[#1D4ED8]"
              >
                <span>{option.name}</span>
                <button
                  type="button"
                  aria-label={`Bỏ ${option.name} khỏi ${label.toLocaleLowerCase()}`}
                  onClick={() => remove(id)}
                  className="flex size-7 items-center justify-center rounded-full text-[#1D4ED8] hover:bg-blue-100 focus-visible:outline-2 focus-visible:outline-[#2563EB]"
                >
                  <X size={14} aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function PositionPicker({
  options,
  selectedId,
  onChange,
  hasError,
}: {
  options: ProfileOption[];
  selectedId: string;
  onChange: (id: string) => void;
  hasError: boolean;
}) {
  return (
    <SearchableSelect
      label="Vị trí"
      options={options}
      selectedId={selectedId}
      onChange={onChange}
      placeholder="Chọn vị trí"
      searchPlaceholder="Tìm vị trí…"
      emptyMessage="Không tìm thấy vị trí phù hợp."
      hasError={hasError}
      errorMessage="Vui lòng chọn vị trí."
      required
    />
  );
}

export function CompanyPicker({
  selectedName,
  onSelect,
  hasError,
}: {
  selectedName: string;
  onSelect: (name: string) => void;
  hasError: boolean;
}) {
  const inputId = useId();
  const listId = useId();
  const errorId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const { searchCompanies } = useCompanies();
  const [query, setQuery] = useState(selectedName);
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<CompanySuggestion[]>([]);
  const { placement, maxHeight } = useDropdownPlacement(
    isOpen && suggestions.length > 0,
    inputRef,
    suggestions.length,
  );

  useEffect(() => {
    const keyword = query.trim();
    if (!isOpen || !keyword) return;

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => {
      void searchCompanies(keyword, controller.signal)
        .then(setSuggestions)
        .catch(() => {
          if (!controller.signal.aborted) setSuggestions([]);
        });
    }, 300);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [isOpen, query, searchCompanies]);

  function selectCompany(company: CompanySuggestion) {
    onSelect(company.name);
    setQuery(company.name);
    setSuggestions([]);
    setIsOpen(false);
  }

  return (
    <div className={labelClass}>
      <label htmlFor={inputId}>Công ty</label>
      <div
        className="relative mt-1.5"
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget))
            setIsOpen(false);
        }}
      >
        <input
          ref={inputRef}
          id={inputId}
          type="search"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={isOpen && suggestions.length > 0}
          aria-controls={listId}
          aria-invalid={hasError}
          aria-describedby={hasError ? errorId : undefined}
          autoComplete="off"
          required
          maxLength={255}
          value={query}
          onFocus={() => setIsOpen(true)}
          onChange={(event) => {
            const value = event.target.value;
            setQuery(value);
            setSuggestions([]);
            setIsOpen(true);
            onSelect("");
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") setIsOpen(false);
            if (event.key === "Enter" && suggestions[0]) {
              event.preventDefault();
              selectCompany(suggestions[0]);
            }
          }}
          placeholder="Tìm công ty…"
          className={`${fieldClass} ${hasError ? "border-red-500 focus:border-red-500 focus:ring-red-100" : ""}`}
        />
        {isOpen && suggestions.length > 0 && (
          <ul
            id={listId}
            role="listbox"
            aria-label="Công ty gợi ý"
            style={{ maxHeight: `${maxHeight}px` }}
            className={`absolute inset-x-0 z-30 overflow-y-auto rounded-xl border border-[#CBD5E1] bg-white p-1.5 shadow-lg ${placement === "above" ? "bottom-full mb-1" : "top-full mt-1"}`}
          >
            {suggestions.map((company, index) => (
              <li
                key={`${company.id ?? company.domain ?? company.name}-${index}`}
                role="presentation"
              >
                <button
                  type="button"
                  role="option"
                  aria-selected={company.name === selectedName}
                  title={company.name}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectCompany(company)}
                  className="block min-h-10 w-full min-w-0 overflow-hidden text-ellipsis whitespace-nowrap rounded-lg px-3 text-left text-sm text-[#334155] hover:bg-blue-50 hover:text-[#1D4ED8] focus-visible:bg-blue-50 focus-visible:outline-none"
                >
                  {company.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {hasError && (
        <p
          id={errorId}
          role="alert"
          className="mt-1 text-xs font-normal text-red-600"
        >
          Chọn công ty trong danh sách.
        </p>
      )}
    </div>
  );
}

export const fieldClass =
  "mt-1.5 h-11 w-full min-w-0 max-w-full rounded-lg border border-[#CBD5E1] bg-white px-3 text-sm text-[#0F172A] outline-none transition focus:border-[#2563EB] focus:ring-4 focus:ring-blue-100";
export const labelClass = "block min-w-0 text-sm font-medium text-[#334155]";

export function ProfileOnboardingModal({ onSkip, onCompleted }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { getOptions, createProfile, isLoading, error, clearError } =
    useProfile();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [options, setOptions] =
    useState<ProfileOnboardingOptions>(EMPTY_OPTIONS);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const [optionsRetry, setOptionsRetry] = useState(0);
  const [salary, setSalary] = useState<number | "">("");
  const [skillIds, setSkillIds] = useState<string[]>([]);
  const [posIds, setPosIds] = useState<string[]>([]);
  const [locIds, setLocIds] = useState<string[]>([]);
  const [wmIds, setWmIds] = useState<string[]>([]);
  const [workExperiences, setWorkExperiences] = useState<WorkExperienceInput[]>(
    [],
  );
  const [degrees, setDegrees] = useState<DegreeInput[]>([]);
  const [experienceValidationAttempted, setExperienceValidationAttempted] =
    useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadOptions() {
      const token = window.localStorage.getItem("accessToken");
      if (!token) {
        setOptionsLoading(false);
        setOptionsError(
          "Phiên đăng nhập đã hết hạn. Đăng nhập lại để tạo hồ sơ.",
        );
        return;
      }
      try {
        const data = await getOptions(token);
        if (!cancelled) {
          setOptions(data);
          setOptionsError(null);
          clearError();
        }
      } catch (cause: unknown) {
        if (!cancelled) {
          setOptionsError(
            cause instanceof Error && cause.message === "SESSION_EXPIRED"
              ? "Phiên đăng nhập đã hết hạn. Đăng nhập lại để tạo hồ sơ."
              : cause instanceof Error
                ? cause.message
                : "Không thể tải danh sách lựa chọn.",
          );
        }
      } finally {
        if (!cancelled) setOptionsLoading(false);
      }
    }
    void loadOptions();
    return () => {
      cancelled = true;
    };
  }, [clearError, getOptions, optionsRetry]);

  function updateExperience(
    index: number,
    patch: Partial<WorkExperienceInput>,
  ) {
    setWorkExperiences((items) =>
      items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    );
  }

  function updateDegree(index: number, patch: Partial<DegreeInput>) {
    setDegrees((items) =>
      items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    );
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    clearError();
    setExperienceValidationAttempted(true);
    if (
      workExperiences.some(
        (experience) => !experience.companyName || !experience.posId,
      )
    )
      return;
    const token = window.localStorage.getItem("accessToken");
    if (!token) {
      setOptionsError(
        "Phiên đăng nhập đã hết hạn. Đăng nhập lại để tạo hồ sơ.",
      );
      return;
    }

    const payload: ProfileOnboardingRequest = {
      exptSalMin: salary === "" ? null : salary,
      skillIds,
      posIds,
      locIds,
      wmIds,
      workExperiences: workExperiences.map((item) => ({
        ...item,
        startAt: `${item.startAt}-01`,
        endAt: item.endAt ? `${item.endAt}-01` : null,
      })),
      degrees,
    };
    try {
      await createProfile(token, payload);
      onCompleted();
    } catch {
      // Keep all entered values so the user can correct or retry.
    }
  }

  const selectedDegreeCount = degrees.length;
  const activeError = optionsError ?? error;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="profile-onboarding-title"
      aria-describedby="profile-onboarding-description"
      onCancel={(event) => {
        event.preventDefault();
      }}
      className="m-auto max-h-[calc(100dvh-1.5rem)] w-[calc(100%-1rem)] max-w-3xl overflow-hidden rounded-2xl border-0 bg-white p-0 text-[#0F172A] shadow-2xl backdrop:bg-slate-950/60"
    >
      <form
        onSubmit={handleSubmit}
        className="flex max-h-[calc(100dvh-1.5rem)] flex-col"
      >
        <header className="flex items-start justify-between gap-4 border-b border-[#E2E8F0] px-5 py-5 sm:px-8 sm:py-6">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#2563EB]">
              Hoàn thiện hồ sơ · Bước {step}/3
            </p>
            <h2
              id="profile-onboarding-title"
              className="text-xl font-bold tracking-tight sm:text-2xl"
            >
              {step === 1
                ? "Mức lương và kỹ năng"
                : step === 2
                  ? "Công việc bạn mong muốn"
                  : "Kinh nghiệm và học vấn"}
            </h2>
            <p
              id="profile-onboarding-description"
              className="mt-1.5 max-w-xl text-sm leading-6 text-[#64748B]"
            >
              {step === 1
                ? "Cho biết mức lương mong muốn và những kỹ năng bạn đang có. Bạn có thể bỏ qua mục chưa muốn điền."
                : step === 2
                  ? "Chọn vị trí, địa điểm và hình thức làm việc phù hợp với bạn."
                  : "Thêm kinh nghiệm và bằng cấp để hồ sơ đầy đủ hơn. Cả hai phần đều có thể để trống."}
            </p>
          </div>
          <button
            type="button"
            onClick={onSkip}
            className="min-h-10 shrink-0 rounded-lg px-3 text-sm font-semibold text-[#64748B] transition hover:bg-[#F1F5F9] hover:text-[#0F172A] focus-visible:outline-2 focus-visible:outline-[#2563EB]"
          >
            Bỏ qua
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-8 sm:py-6">
          {activeError && <ToastNotice kind="error" message={activeError} />}
          {optionsLoading && (
            <p role="status" className="text-sm text-[#64748B]">
              Đang tải danh sách lựa chọn…
            </p>
          )}
          {optionsError && (
            <button
              type="button"
              onClick={() => {
                clearError();
                setOptionsError(null);
                setOptionsLoading(true);
                setOptionsRetry((count) => count + 1);
              }}
              className="min-h-10 rounded-lg border border-[#CBD5E1] px-3 text-sm font-semibold text-[#334155] hover:bg-[#F8FAFC] focus-visible:outline-2 focus-visible:outline-[#2563EB]"
            >
              Thử tải lại danh sách
            </button>
          )}
          {step === 1 ? (
            <>
              <label className={labelClass}>
                Mức lương tối thiểu mong muốn (VNĐ/tháng)
                <input
                  type="text"
                  inputMode="numeric"
                  value={formatCurrency(salary)}
                  onChange={(event) => {
                    const value = event.target.value;
                    if (!/^[\d.]*$/.test(value)) return;
                    setSalary(value === "" ? "" : parseCurrency(value));
                  }}
                  placeholder="Ví dụ: 15000000"
                  className={fieldClass}
                />
              </label>
              <OptionPicker
                label="Kỹ năng hiện có"
                options={options.skills}
                selected={skillIds}
                onChange={setSkillIds}
              />
            </>
          ) : step === 2 ? (
            <>
              <OptionPicker
                label="Vị trí mong muốn"
                options={options.positions}
                selected={posIds}
                onChange={setPosIds}
              />
              <OptionPicker
                label="Địa điểm làm việc mong muốn"
                options={options.locations}
                selected={locIds}
                onChange={setLocIds}
              />
              <OptionPicker
                label="Hình thức làm việc mong muốn"
                options={options.workModes}
                selected={wmIds}
                onChange={setWmIds}
              />
            </>
          ) : (
            <>
              <section
                aria-labelledby="experience-heading"
                className="space-y-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 id="experience-heading" className="font-semibold">
                      Kinh nghiệm làm việc
                    </h3>
                    <p className="mt-1 text-xs text-[#64748B]">
                      Có thể để trống nếu bạn chưa có kinh nghiệm.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setExperienceValidationAttempted(false);
                      setWorkExperiences((items) => [
                        ...items,
                        {
                          companyName: "",
                          posId: "",
                          startAt: "",
                          endAt: null,
                        },
                      ]);
                    }}
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-[#CBD5E1] px-3 text-sm font-semibold text-[#334155] hover:bg-[#F8FAFC] focus-visible:outline-2 focus-visible:outline-[#2563EB]"
                  >
                    <Plus size={16} aria-hidden="true" />
                    Thêm
                  </button>
                </div>
                {workExperiences.map((experience, index) => (
                  <fieldset
                    key={`experience-${index}`}
                    className="relative grid min-w-0 gap-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"
                  >
                    <legend className="sr-only">Kinh nghiệm {index + 1}</legend>
                    <button
                      type="button"
                      aria-label={`Xóa kinh nghiệm ${index + 1}`}
                      onClick={() =>
                        setWorkExperiences((items) =>
                          items.filter((_, itemIndex) => itemIndex !== index),
                        )
                      }
                      className="absolute right-2 top-2 rounded-lg p-2 text-[#64748B] hover:bg-white hover:text-red-600 focus-visible:outline-2 focus-visible:outline-[#2563EB]"
                    >
                      <X size={16} />
                    </button>
                    <CompanyPicker
                      key={`experience-company-${index}`}
                      selectedName={experience.companyName}
                      onSelect={(companyName) =>
                        updateExperience(index, { companyName })
                      }
                      hasError={
                        experienceValidationAttempted && !experience.companyName
                      }
                    />
                    <PositionPicker
                      key={`experience-position-${index}`}
                      options={options.positions}
                      selectedId={experience.posId}
                      onChange={(posId) => updateExperience(index, { posId })}
                      hasError={
                        experienceValidationAttempted && !experience.posId
                      }
                    />
                    <label className={labelClass}>
                      Bắt đầu
                      <input
                        required
                        type="month"
                        value={experience.startAt}
                        onChange={(event) =>
                          updateExperience(index, {
                            startAt: event.target.value,
                          })
                        }
                        className={fieldClass}
                      />
                    </label>
                    <label className={labelClass}>
                      Kết thúc{" "}
                      <span className="font-normal text-[#64748B]">
                        (để trống nếu đang làm)
                      </span>
                      <input
                        type="month"
                        min={experience.startAt || undefined}
                        value={experience.endAt ?? ""}
                        onChange={(event) =>
                          updateExperience(index, {
                            endAt: event.target.value || null,
                          })
                        }
                        className={fieldClass}
                      />
                    </label>
                  </fieldset>
                ))}
              </section>

              <section
                aria-labelledby="degree-heading"
                className="space-y-3 border-t border-[#E2E8F0] pt-5"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 id="degree-heading" className="font-semibold">
                      Bằng cấp
                    </h3>
                    <p className="mt-1 text-xs text-[#64748B]">
                      Mỗi bằng cấp cần thông tin và ảnh chứng nhận.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setDegrees((items) => [
                        ...items,
                        {
                          degMajor: "",
                          degInstitution: "",
                          degSignedBy: "",
                          degIssuedAt: "",
                          qualId: "",
                          degImage: undefined as unknown as File,
                        },
                      ])
                    }
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-[#CBD5E1] px-3 text-sm font-semibold text-[#334155] hover:bg-[#F8FAFC] focus-visible:outline-2 focus-visible:outline-[#2563EB]"
                  >
                    <Plus size={16} aria-hidden="true" />
                    Thêm
                  </button>
                </div>
                {degrees.map((degree, index) => (
                  <fieldset
                    key={`degree-${index}`}
                    className="relative grid min-w-0 gap-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"
                  >
                    <legend className="sr-only">Bằng cấp {index + 1}</legend>
                    <button
                      type="button"
                      aria-label={`Xóa bằng cấp ${index + 1}`}
                      onClick={() =>
                        setDegrees((items) =>
                          items.filter((_, itemIndex) => itemIndex !== index),
                        )
                      }
                      className="absolute right-2 top-2 rounded-lg p-2 text-[#64748B] hover:bg-white hover:text-red-600 focus-visible:outline-2 focus-visible:outline-[#2563EB]"
                    >
                      <X size={16} />
                    </button>
                    <label className={labelClass}>
                      Chuyên ngành
                      <input
                        required
                        maxLength={255}
                        value={degree.degMajor}
                        onChange={(event) =>
                          updateDegree(index, { degMajor: event.target.value })
                        }
                        className={fieldClass}
                      />
                    </label>
                    <label className={labelClass}>
                      Học vị
                      <select
                        required
                        value={degree.qualId}
                        onChange={(event) =>
                          updateDegree(index, { qualId: event.target.value })
                        }
                        className={fieldClass}
                      >
                        <option value="">Chọn học vị</option>
                        {options.qualifications.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className={labelClass}>
                      Cơ sở đào tạo
                      <input
                        required
                        maxLength={255}
                        value={degree.degInstitution}
                        onChange={(event) =>
                          updateDegree(index, {
                            degInstitution: event.target.value,
                          })
                        }
                        className={fieldClass}
                      />
                    </label>
                    <label className={labelClass}>
                      Đơn vị cấp bằng
                      <input
                        required
                        maxLength={255}
                        value={degree.degSignedBy}
                        onChange={(event) =>
                          updateDegree(index, {
                            degSignedBy: event.target.value,
                          })
                        }
                        className={fieldClass}
                      />
                    </label>
                    <label className={labelClass}>
                      Ngày cấp
                      <input
                        required
                        type="date"
                        value={degree.degIssuedAt}
                        onChange={(event) =>
                          updateDegree(index, {
                            degIssuedAt: event.target.value,
                          })
                        }
                        className={fieldClass}
                      />
                    </label>
                    <label className={labelClass}>
                      Ảnh chứng nhận
                      <input
                        required
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(event) =>
                          updateDegree(index, {
                            degImage:
                              event.target.files?.[0] ??
                              (undefined as unknown as File),
                          })
                        }
                        className="mt-1.5 block min-h-11 w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-1 file:text-sm file:font-semibold file:text-[#1D4ED8] focus-visible:outline-2 focus-visible:outline-[#2563EB]"
                      />
                      <span className="mt-1 block text-xs font-normal text-[#64748B]">
                        JPEG, PNG hoặc WebP
                      </span>
                    </label>
                    {degree.degImage && (
                      <p className="sm:col-span-2 text-xs text-[#475569]">
                        Đã chọn: {degree.degImage.name}
                      </p>
                    )}
                  </fieldset>
                ))}
              </section>
            </>
          )}
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E2E8F0] bg-white px-5 py-4 sm:px-8">
          <div
            className="flex items-center gap-2 text-xs text-[#64748B]"
            aria-label={`Bước ${step} trên 3`}
          >
            {[1, 2, 3].map((stepNumber) => (
              <span
                key={stepNumber}
                className={`size-2 rounded-full ${step === stepNumber ? "bg-[#2563EB]" : "bg-[#CBD5E1]"}`}
              />
            ))}
          </div>
          <div className="ml-auto flex gap-2">
            {step > 1 && (
              <button
                type="button"
                onClick={() => {
                  clearError();
                  setStep((current) => (current - 1) as 1 | 2);
                }}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#CBD5E1] px-4 text-sm font-semibold text-[#334155] hover:bg-[#F8FAFC] focus-visible:outline-2 focus-visible:outline-[#2563EB]"
              >
                <ArrowLeft size={16} aria-hidden="true" />
                Quay lại
              </button>
            )}
            {step < 3 ? (
              <button
                type="button"
                onClick={() => {
                  clearError();
                  setStep((current) => (current + 1) as 2 | 3);
                }}
                disabled={optionsLoading || Boolean(optionsError)}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#2563EB] px-5 text-sm font-semibold text-white transition hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Tiếp tục <ArrowRight size={16} aria-hidden="true" />
              </button>
            ) : (
              <>
                <button
                  type="submit"
                  disabled={isLoading || optionsLoading}
                  className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#2563EB] px-5 text-sm font-semibold text-white transition hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoading ? (
                    "Đang lưu…"
                  ) : (
                    <>
                      Hoàn tất hồ sơ{" "}
                      {selectedDegreeCount > 0 ? (
                        <GraduationCap size={16} aria-hidden="true" />
                      ) : (
                        <BriefcaseBusiness size={16} aria-hidden="true" />
                      )}
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </footer>
      </form>
    </dialog>
  );
}
