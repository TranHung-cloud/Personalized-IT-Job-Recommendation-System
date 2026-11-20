"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useDropdownPlacement } from "@/hook/useDropdownPlacement";

export type SearchableOption = { id: string; name: string };

type SearchableSelectProps = {
  options: SearchableOption[];
  selectedId: string;
  onChange: (id: string) => void;
  placeholder: string;
  searchPlaceholder: string;
  emptyMessage: string;
  label?: string;
  ariaLabel?: string;
  hasError?: boolean;
  errorMessage?: string;
  required?: boolean;
  clearLabel?: string;
  triggerClassName?: string;
  zIndexClassName?: string;
};

export function SearchableSelect({
  options,
  selectedId,
  onChange,
  placeholder,
  searchPlaceholder,
  emptyMessage,
  label,
  ariaLabel,
  hasError = false,
  errorMessage,
  required = false,
  clearLabel,
  triggerClassName = "",
  zIndexClassName = "z-30",
}: SearchableSelectProps) {
  const inputId = useId();
  const listId = useId();
  const errorId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const matchingOptions = useMemo(
    () =>
      options.filter((option) =>
        option.name
          .toLocaleLowerCase()
          .includes(query.trim().toLocaleLowerCase()),
      ),
    [options, query],
  );
  const selectedOption = options.find((option) => option.id === selectedId);
  const { placement, maxHeight } = useDropdownPlacement(
    isOpen,
    triggerRef,
    matchingOptions.length + (clearLabel ? 1 : 0),
  );

  useEffect(() => {
    if (isOpen) searchRef.current?.focus();
  }, [isOpen]);

  function choose(id: string) {
    onChange(id);
    setQuery("");
    setIsOpen(false);
    triggerRef.current?.focus();
  }

  const trigger = (
    <button
      ref={triggerRef}
      id={inputId}
      type="button"
      role="combobox"
      aria-label={!label ? ariaLabel : undefined}
      aria-labelledby={label ? `${inputId}-label ${inputId}-value` : undefined}
      aria-haspopup="listbox"
      aria-expanded={isOpen}
      aria-controls={listId}
      aria-required={required || undefined}
      aria-invalid={hasError || undefined}
      aria-describedby={hasError && errorMessage ? errorId : undefined}
      onClick={() => setIsOpen((open) => !open)}
      onKeyDown={(event) => {
        if (event.key === "Escape") setIsOpen(false);
        if (event.key === "ArrowDown") setIsOpen(true);
      }}
      className={`flex h-11 w-full min-w-0 items-center justify-between gap-2 rounded-lg border bg-white px-3 text-left text-sm outline-none transition focus:ring-4 ${hasError ? "border-red-500 focus:border-red-500 focus:ring-red-100" : "border-[#CBD5E1] focus:border-[#2563EB] focus:ring-blue-100"} ${triggerClassName}`}
    >
      <span
        id={`${inputId}-value`}
        title={selectedOption?.name}
        className={`min-w-0 flex-1 truncate ${selectedOption ? "text-[#0F172A]" : "text-[#64748B]"}`}
      >
        {selectedOption?.name ?? placeholder}
      </span>
      <ChevronDown
        size={16}
        aria-hidden="true"
        className="shrink-0 text-[#64748B]"
      />
    </button>
  );

  return (
    <div
      className={
        label
          ? "block min-w-0 text-sm font-medium text-[#334155]"
          : "relative min-w-0"
      }
    >
      {label && <span id={`${inputId}-label`}>{label}</span>}
      <div
        className={label ? "relative mt-1.5" : "relative"}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget))
            setIsOpen(false);
        }}
      >
        {trigger}
        {isOpen && (
          <div
            style={{ maxHeight: `${maxHeight}px` }}
            className={`absolute inset-x-0 ${zIndexClassName} flex min-w-0 flex-col overflow-hidden rounded-xl border border-[#CBD5E1] bg-white p-1.5 shadow-lg ${placement === "above" ? "bottom-full mb-1" : "top-full mt-1"}`}
          >
            <input
              ref={searchRef}
              type="search"
              aria-label={searchPlaceholder}
              aria-controls={listId}
              autoComplete="off"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  setIsOpen(false);
                  triggerRef.current?.focus();
                }
                if (event.key === "Enter") {
                  event.preventDefault();
                  if (matchingOptions[0]) choose(matchingOptions[0].id);
                }
              }}
              placeholder={searchPlaceholder}
              className="mb-1.5 h-10 w-full min-w-0 shrink-0 rounded-lg border border-[#E2E8F0] px-3 text-sm outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100"
            />
            <ul
              id={listId}
              role="listbox"
              aria-label={label ?? ariaLabel}
              className="min-h-0 overflow-y-auto"
            >
              {clearLabel && (
                <li role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={!selectedId}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => choose("")}
                    className="block min-h-10 w-full min-w-0 overflow-hidden text-ellipsis whitespace-nowrap rounded-lg px-3 text-left text-sm text-[#64748B] hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none"
                  >
                    {clearLabel}
                  </button>
                </li>
              )}
              {matchingOptions.length > 0 ? (
                matchingOptions.map((option) => (
                  <li key={option.id} role="presentation">
                    <button
                      type="button"
                      role="option"
                      aria-selected={option.id === selectedId}
                      title={option.name}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => choose(option.id)}
                      className="block min-h-10 w-full min-w-0 overflow-hidden text-ellipsis whitespace-nowrap rounded-lg px-3 text-left text-sm text-[#334155] hover:bg-blue-50 hover:text-[#1D4ED8] focus-visible:bg-blue-50 focus-visible:outline-none"
                    >
                      {option.name}
                    </button>
                  </li>
                ))
              ) : (
                <li className="px-3 py-2 text-sm text-[#64748B]">
                  {emptyMessage}
                </li>
              )}
            </ul>
          </div>
        )}
      </div>
      {hasError && errorMessage && (
        <p
          id={errorId}
          role="alert"
          className="mt-1 text-xs font-normal text-red-600"
        >
          {errorMessage}
        </p>
      )}
    </div>
  );
}
