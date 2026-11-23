"use client";

import { useEffect, useState } from "react";
import { useCompanies } from "@/hook/useCompanies";

interface CompanyLogoProps {
  companyId: string | null;
  companyName?: string | null;
  className?: string;
}

export function CompanyLogo({
  companyId,
  companyName,
  className = "size-12",
}: CompanyLogoProps) {
  const { getCompanyLogo } = useCompanies();
  const [logo, setLogo] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;

    const loadLogo = async () => {
      if (!companyId) {
        setLogo(null);
        return;
      }

      try {
        const token = localStorage.getItem("accessToken");
        if (!token) return;

        const url = await getCompanyLogo(token, companyId);

        if (cancelled) {
          if (url) URL.revokeObjectURL(url);
          return;
        }

        objectUrl = url;
        setLogo(url);
      } catch (error) {
        if (!cancelled) {
          console.error("Load company logo failed:", error);
          setLogo(null);
        }
      }
    };

    if (companyId) loadLogo();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [companyId, getCompanyLogo]);

  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white ${className}`}
    >
      <img
        src={logo || "/no_logo.png"}
        alt={companyName || "Company logo"}
        className="size-full object-contain"
        onError={(e) => {
          e.currentTarget.src = "/no_logo.png";
        }}
      />
    </div>
  );
}
