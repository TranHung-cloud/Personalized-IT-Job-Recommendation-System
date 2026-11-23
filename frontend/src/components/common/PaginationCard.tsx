"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationCardProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function PaginationCard({
  currentPage,
  totalPages,
  onPageChange,
}: PaginationCardProps) {
  if (totalPages <= 1) return null;

  const getPages = () => {
    const pages: number[] = [];

    let start = Math.max(0, currentPage - 2);
    let end = Math.min(totalPages - 1, start + 4);

    start = Math.max(0, end - 4);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  };

  const pages = getPages();

  return (
    <div className="flex items-center justify-center gap-2 py-6">
      {" "}
      <button
        type="button"
        disabled={currentPage === 0}
        onClick={() => onPageChange(currentPage - 1)}
        className="flex size-9 items-center justify-center rounded-lg border border-[#E2E8F0] bg-white text-[#64748B] transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Trang trước"
      >
        {" "}
        <ChevronLeft size={18} />{" "}
      </button>
      {pages.map((page) => (
        <button
          key={page}
          type="button"
          onClick={() => onPageChange(page)}
          aria-current={currentPage === page ? "page" : undefined}
          className={`flex size-9 items-center justify-center rounded-lg text-sm font-semibold transition ${
            currentPage === page
              ? "bg-[#2563EB] text-white shadow-sm"
              : "border border-[#E2E8F0] bg-white text-[#475569] hover:bg-blue-50"
          }`}
        >
          {page + 1}
        </button>
      ))}
      <button
        type="button"
        disabled={currentPage === totalPages - 1}
        onClick={() => onPageChange(currentPage + 1)}
        className="flex size-9 items-center justify-center rounded-lg border border-[#E2E8F0] bg-white text-[#64748B] transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Trang tiếp theo"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
}
