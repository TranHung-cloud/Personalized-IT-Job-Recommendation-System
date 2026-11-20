import { Children, isValidElement, type ReactNode } from "react";
import { ToastNotice, type ToastKind } from "@/components/ui/toast-notice";

function toText(node: ReactNode): string {
  return Children.toArray(node).map((child) => {
    if (typeof child === "string" || typeof child === "number") return String(child);
    if (isValidElement<{ children?: ReactNode }>(child)) return toText(child.props.children);
    return "";
  }).join("");
}

export function AuthNotice({ kind, children }: { kind: ToastKind; children: ReactNode }) {
  return <ToastNotice kind={kind} message={toText(children)} />;
}
