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

  return { searchCompanies };
}
