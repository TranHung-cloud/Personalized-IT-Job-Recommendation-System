"use client";

import { useEffect, useState } from "react";
import { Image as ImageIcon, LoaderCircle } from "lucide-react";
import { useProfile } from "@/hook/useProfile";

type Props = {
  degreeId?: string;
  file?: File;
  alt: string;
};

export function DegreeCertificatePreview({ degreeId, file, alt }: Props) {
  const { getDegreeImage } = useProfile();
  const sourceKey: File | string | null = file ?? degreeId ?? null;
  const [preview, setPreview] = useState<{
    key: File | string;
    src?: string;
    status: "ready" | "error";
  } | null>(null);
  const currentPreview = preview?.key === sourceKey ? preview : null;
  const src = currentPreview?.src ?? null;
  const loading = Boolean(degreeId && !file && !currentPreview);
  const error = currentPreview?.status === "error";

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    if (file) {
      objectUrl = URL.createObjectURL(file);
      void Promise.resolve().then(() => {
        if (cancelled) {
          if (objectUrl) URL.revokeObjectURL(objectUrl);
        } else {
          setPreview({ key: file, src: objectUrl ?? undefined, status: "ready" });
        }
      });
      return () => {
        cancelled = true;
        if (objectUrl) URL.revokeObjectURL(objectUrl);
      };
    }

    if (!degreeId) return () => { cancelled = true; };

    const token = window.localStorage.getItem("accessToken");
    if (!token) {
      void Promise.resolve().then(() => {
        if (!cancelled) setPreview({ key: degreeId, status: "error" });
      });
      return () => { cancelled = true; };
    }

    void getDegreeImage(token, degreeId)
      .then((url) => {
        objectUrl = url;
        if (cancelled) URL.revokeObjectURL(url);
        else setPreview({ key: degreeId, src: url, status: "ready" });
      })
      .catch(() => {
        if (!cancelled) setPreview({ key: degreeId, status: "error" });
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [degreeId, file, getDegreeImage]);

  return (
    <div className="mt-2 overflow-hidden rounded-lg border border-[#E2E8F0] bg-white">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} className="max-h-72 w-full object-contain" />
      ) : (
        <div className="grid min-h-32 place-items-center gap-2 px-4 py-6 text-center text-sm text-[#64748B]">
          {loading ? <LoaderCircle size={22} className="animate-spin" aria-hidden="true" /> : <ImageIcon size={24} aria-hidden="true" />}
          <span>{loading ? "Đang tải ảnh…" : error ? "Không thể tải ảnh chứng nhận." : "Ảnh chứng nhận sẽ hiển thị tại đây."}</span>
        </div>
      )}
    </div>
  );
}
