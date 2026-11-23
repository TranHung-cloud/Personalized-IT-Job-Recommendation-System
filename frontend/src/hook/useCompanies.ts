import { useCallback } from "react";
import type { CompanySuggestion } from "@/type/company";

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080").replace(/\/$/, "");

export function useCompanies() {
  const searchCompanies = useCallback(async (keyword: string, signal: AbortSignal) => {
    const token = window.localStorage.getItem("accessToken");
    if (!token) return [] as CompanySuggestion[];

    const query = new URLSearchParams({ keyword });
    const response = await fetch(`${API_URL}/api/companies/search?${query.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal,
    });
    if (!response.ok) throw new Error("Company search failed");

    return await response.json() as CompanySuggestion[];
  }, []);

    const getCompanyLogo = useCallback(async (token: string, companyId: string) :  Promise<string | null> => {
      let response: Response;
      try {
        response = await fetch(`${API_URL}/api/companies/${companyId}/logo`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        throw new Error("Không thể kết nối máy chủ để tải logo công ty.");
      }
      if (response.status === 401) throw new Error("SESSION_EXPIRED");
      if (response.status === 404) return null;
      if (!response.ok) throw new Error("Không thể tải logo công ty.");
      return URL.createObjectURL(await response.blob());
    }, []);

  return { searchCompanies, getCompanyLogo };
}
