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
    if (!message) {
      lastToast.current = "";
      return;
    }

    const key = `${kind}:${message}:${actionLabel ?? ""}`;

    if (lastToast.current === key) return;

    lastToast.current = key;

    const options = {
      id: "match-undo-toast",
      duration: 7000,
      ...(actionLabel && onAction
        ? {
            action: {
              label: actionLabel,
              onClick: () => actionRef.current?.(),
            },
            actionButtonStyle: {
              background: "#2563EB",
              color: "#FFFFFF",
              fontWeight: 600,
              borderRadius: "8px",
            },
          }
        : {}),
    };

    toast[kind](message, options);
  }, [actionLabel, kind, message]);

  return null;
}
