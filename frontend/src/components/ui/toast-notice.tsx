"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

export type ToastKind = "success" | "error" | "info" | "warning";

export function ToastNotice({
  kind,
  message,
  actionLabel,
  onAction,
}: {
  kind: ToastKind;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const lastToast = useRef("");
  const actionRef = useRef(onAction);
  actionRef.current = onAction;

  useEffect(() => {
    const key = `${kind}:${message}:${actionLabel ?? ""}`;
    if (!message || lastToast.current === key) return;
    lastToast.current = key;

    const options = actionLabel && onAction
      ? { action: { label: actionLabel, onClick: () => actionRef.current?.() }, duration: 7000 }
      : undefined;
    toast[kind](message, options);
  }, [actionLabel, kind, message]);

  return null;
}
