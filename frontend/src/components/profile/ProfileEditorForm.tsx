"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  BriefcaseBusiness,
  ChevronDown,
  GraduationCap,
  Plus,
  X,
} from "lucide-react";
import { useProfile } from "@/hook/useProfile";
import { DegreeCertificatePreview } from "@/components/profile/DegreeCertificatePreview";
import type {
  DegreeInput,
  ProfileOnboardingOptions,
  ProfileOnboardingRequest,
  ProfileOption,
  ProfileView,
  WorkExperienceInput,
} from "@/type/profile";
import {
  CompanyPicker,
  fieldClass,
  labelClass,
  OptionPicker,
  PositionPicker,
} from "@/components/profile/ProfileOnboardingModal";
import { formatCurrency, parseCurrency } from "@/lib/formatCurrency";

type DegreeFormValue = DegreeInput & { existingImagePath?: string };

type Props = {
  mode: "create" | "edit";
  profile?: ProfileView;
  onCancel: () => void;
  onSaved: () => void;
};

const EMPTY_OPTIONS: ProfileOnboardingOptions = {
  skills: [],
  positions: [],
  locations: [],
  workModes: [],
  qualifications: [],
};

function optionIds(options: ProfileOption[] | undefined) {
  return options?.map((option) => option.id) ?? [];
}

export function ProfileEditorForm({ mode, profile, onCancel, onSaved }: Props) {
  const {
    getOptions,
    createProfile,
    updateProfile,
    isLoading,
    error,
    clearError,
  } = useProfile();
  const [options, setOptions] =
    useState<ProfileOnboardingOptions>(EMPTY_OPTIONS);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const [optionsRetry, setOptionsRetry] = useState(0);
  const [salary, setSalary] = useState<number | string>(
    profile?.exptSalMin ?? "",
  );
  const [skillIds, setSkillIds] = useState<string[]>(optionIds(profile?.skill));
  const [posIds, setPosIds] = useState<string[]>(optionIds(profile?.pos));
  const [locIds, setLocIds] = useState<string[]>(optionIds(profile?.loc));
  const [wmIds, setWmIds] = useState<string[]>(optionIds(profile?.wm));
  const [workExperiences, setWorkExperiences] = useState<WorkExperienceInput[]>(
    profile?.workExperiences.map((experience) => ({
      companyName: experience.company.name,
      posId: experience.position.id,
      startAt: experience.startAt.slice(0, 7),
      endAt: experience.endAt?.slice(0, 7) ?? null,
    })) ?? [],
  );
  const [degrees, setDegrees] = useState<DegreeFormValue[]>(
    profile?.degrees.map((degree) => ({
      id: degree.id,
      degMajor: degree.degMajor,
      degInstitution: degree.degInstitution,
      degSignedBy: degree.degSignedBy,
      degIssuedAt: degree.degIssuedAt,
      qualId: degree.qual.id,
      existingImagePath: degree.degImgPath,
    })) ?? [],
  );
  const [experienceValidationAttempted, setExperienceValidationAttempted] =
    useState(false);
  const [degreeValidationAttempted, setDegreeValidationAttempted] =
    useState(false);
  const [createEmptyAttempted, setCreateEmptyAttempted] = useState(false);
  const [openDegreeIndex, setOpenDegreeIndex] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadOptions() {
      const token = window.localStorage.getItem("accessToken");
      if (!token) {
        if (!cancelled) {
          setOptionsLoading(false);
          setOptionsError(
            "Phiên đăng nhập đã hết hạn. Đăng nhập lại để tiếp tục.",
          );
        }
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
              ? "Phiên đăng nhập đã hết hạn. Đăng nhập lại để tiếp tục."
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

  function updateDegree(index: number, patch: Partial<DegreeFormValue>) {
    setDegrees((items) =>
      items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearError();
    setExperienceValidationAttempted(true);
    setDegreeValidationAttempted(true);
    if (
      workExperiences.some(
        (experience) => !experience.companyName || !experience.posId,
      )
    )
      return;
    if (degrees.some((degree) => !degree.existingImagePath && !degree.degImage))
      return;
    if (mode === "create" && !hasProfileData) {
      setCreateEmptyAttempted(true);
      return;
    }

    const token = window.localStorage.getItem("accessToken");
    if (!token) {
      setOptionsError("Phiên đăng nhập đã hết hạn. Đăng nhập lại để tiếp tục.");
      return;
    }

    const payload: ProfileOnboardingRequest = {
      exptSalMin: salary === "" ? null : Number(salary),
      skillIds,
      posIds,
      locIds,
      wmIds,
      workExperiences: workExperiences.map((experience) => ({
        ...experience,
        startAt: `${experience.startAt}-01`,
        endAt: experience.endAt ? `${experience.endAt}-01` : null,
      })),
      degrees,
    };

    try {
      if (mode === "edit") await updateProfile(token, payload);
      else await createProfile(token, payload);
      onSaved();
    } catch {
      // Keep entered values so the user can correct the form or retry.
    }
  }

  const hasProfileData =
    salary !== "" ||
    skillIds.length > 0 ||
    posIds.length > 0 ||
    locIds.length > 0 ||
    wmIds.length > 0 ||
    workExperiences.length > 0 ||
    degrees.length > 0;
  const activeError =
    optionsError ??
    error ??
    (createEmptyAttempted && !hasProfileData
      ? "Hãy nhập ít nhất một thông tin trước khi tạo hồ sơ."
      : null);

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <header className="rounded-2xl border border-[#E2E8F0] bg-white p-5 sm:p-6">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#2563EB]">
          Hồ sơ của tôi
        </p>
        <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
          {mode === "create" ? "Tạo hồ sơ" : "Chỉnh sửa hồ sơ"}
        </h2>
        <p className="mt-1.5 text-sm leading-6 text-[#64748B]">
          Cập nhật các thông tin bên dưới rồi lưu hồ sơ của bạn.
        </p>
      </header>

      <section className="space-y-5 rounded-2xl border border-[#E2E8F0] bg-white p-5 sm:p-6">
        {activeError && (
          <p
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-800"
          >
            {activeError}
          </p>
        )}
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
            className="min-h-10 rounded-lg border border-[#CBD5E1] px-3 text-sm font-semibold text-[#334155] hover:bg-[#F8FAFC]"
          >
            Thử tải lại danh sách
          </button>
        )}

        <>
          <section
            aria-labelledby="editor-preferences-heading"
            className="space-y-5"
          >
            <div>
              <h3 id="editor-preferences-heading" className="font-semibold">
                Mong muốn công việc
              </h3>
              <p className="mt-1 text-xs text-[#64748B]">
                Chọn mức lương và những tiêu chí bạn đang tìm kiếm.
              </p>
            </div>
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
          </section>
          <section
            aria-labelledby="editor-experience-heading"
            className="space-y-3 border-t border-[#E2E8F0] pt-5"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 id="editor-experience-heading" className="font-semibold">
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
                    { companyName: "", posId: "", startAt: "", endAt: null },
                  ]);
                }}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-[#CBD5E1] px-3 text-sm font-semibold text-[#334155] hover:bg-[#F8FAFC]"
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
                  className="absolute right-2 top-2 rounded-lg p-2 text-[#64748B] hover:bg-white hover:text-red-600"
                >
                  <X size={16} />
                </button>
                <CompanyPicker
                  selectedName={experience.companyName}
                  onSelect={(companyName) =>
                    updateExperience(index, { companyName })
                  }
                  hasError={
                    experienceValidationAttempted && !experience.companyName
                  }
                />
                <PositionPicker
                  options={options.positions}
                  selectedId={experience.posId}
                  onChange={(posId) => updateExperience(index, { posId })}
                  hasError={experienceValidationAttempted && !experience.posId}
                />
                <label className={labelClass}>
                  Bắt đầu
                  <input
                    required
                    type="month"
                    value={experience.startAt}
                    onChange={(event) =>
                      updateExperience(index, { startAt: event.target.value })
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
            aria-labelledby="editor-degree-heading"
            className="space-y-3 border-t border-[#E2E8F0] pt-5"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 id="editor-degree-heading" className="font-semibold">
                  Bằng cấp
                </h3>
                <p className="mt-1 text-xs text-[#64748B]">
                  Ảnh hiện có sẽ được giữ nếu bạn không chọn ảnh thay thế.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setDegreeValidationAttempted(false);
                  setDegrees((items) => [
                    ...items,
                    {
                      degMajor: "",
                      degInstitution: "",
                      degSignedBy: "",
                      degIssuedAt: "",
                      qualId: "",
                    },
                  ]);
                }}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-[#CBD5E1] px-3 text-sm font-semibold text-[#334155] hover:bg-[#F8FAFC]"
              >
                <Plus size={16} aria-hidden="true" />
                Thêm
              </button>
            </div>
            {degrees.map((degree, index) => (
              <fieldset
                key={`degree-${degree.id ?? index}`}
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
                  className="absolute right-2 top-2 rounded-lg p-2 text-[#64748B] hover:bg-white hover:text-red-600"
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
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() =>
                        setOpenDegreeIndex(
                          openDegreeIndex === index ? null : index,
                        )
                      }
                      className={`${fieldClass} flex w-full items-center justify-between text-left`}
                    >
                      <span
                        className={
                          degree.qualId ? "text-[#334155]" : "text-[#94A3B8]"
                        }
                      >
                        {options.qualifications.find(
                          (item) => item.id === degree.qualId,
                        )?.name || "Chọn học vị"}
                      </span>

                      <ChevronDown
                        size={18}
                        className={`shrink-0 text-[#64748B] transition-transform duration-200 ${
                          openDegreeIndex === index ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {openDegreeIndex === index && (
                      <div className="absolute inset-x-0 top-full z-30 mt-1 max-h-60 overflow-y-auto rounded-xl border border-[#CBD5E1] bg-white p-1.5 shadow-lg">
                        {options.qualifications.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();

                              updateDegree(index, { qualId: item.id });
                              setOpenDegreeIndex(null);
                            }}
                            className={`block min-h-10 w-full rounded-lg px-3 text-left text-sm transition-colors hover:bg-blue-50 hover:text-[#1D4ED8] ${
                              degree.qualId === item.id
                                ? "bg-blue-50 text-[#1D4ED8]"
                                : "text-[#334155]"
                            }`}
                          >
                            {item.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
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
                      updateDegree(index, { degSignedBy: event.target.value })
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
                      updateDegree(index, { degIssuedAt: event.target.value })
                    }
                    className={fieldClass}
                  />
                </label>
                <label className={labelClass}>
                  Ảnh chứng nhận
                  <input
                    required={!degree.existingImagePath}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(event) =>
                      updateDegree(index, { degImage: event.target.files?.[0] })
                    }
                    className="mt-1.5 block min-h-11 w-full min-w-0 rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-1 file:text-sm file:font-semibold file:text-[#1D4ED8]"
                  />
                  {degree.existingImagePath && !degree.degImage && (
                    <span className="mt-1 block text-xs font-normal text-emerald-700">
                      Ảnh chứng nhận đã lưu
                    </span>
                  )}
                  {degree.degImage && (
                    <span className="mt-1 block text-xs font-normal text-[#475569]">
                      Ảnh thay thế: {degree.degImage.name}
                    </span>
                  )}
                  {degreeValidationAttempted &&
                    !degree.existingImagePath &&
                    !degree.degImage && (
                      <span
                        role="alert"
                        className="mt-1 block text-xs font-normal text-red-600"
                      >
                        Vui lòng chọn ảnh chứng nhận.
                      </span>
                    )}
                </label>
                <div className="sm:col-span-2 w-full">
                  <DegreeCertificatePreview
                    degreeId={degree.id}
                    file={degree.degImage}
                    alt={`Ảnh chứng nhận ${degree.degMajor || index + 1}`}
                  />
                </div>
              </fieldset>
            ))}
          </section>
        </>
      </section>

      <footer className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="min-h-11 rounded-lg px-4 text-sm font-semibold text-[#64748B] hover:bg-[#F1F5F9]"
        >
          Hủy
        </button>
        <div className="ml-auto flex gap-2">
          <button
            type="submit"
            disabled={isLoading || optionsLoading}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#2563EB] px-5 text-sm font-semibold text-white hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? (
              "Đang lưu…"
            ) : (
              <>
                Lưu hồ sơ{" "}
                {degrees.length > 0 ? (
                  <GraduationCap size={16} aria-hidden="true" />
                ) : (
                  <BriefcaseBusiness size={16} aria-hidden="true" />
                )}
              </>
            )}
          </button>
        </div>
      </footer>
    </form>
  );
}
