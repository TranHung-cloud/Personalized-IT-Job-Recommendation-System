import { AlertCircle, CheckCircle2, Info } from "lucide-react";

export function AuthNotice({ kind, children }: { kind: "error" | "success" | "info"; children: React.ReactNode }) {
  const styles = {
    error: "border-red-200 bg-red-50 text-red-800",
    success: "border-green-200 bg-green-50 text-green-800",
    info: "border-blue-200 bg-blue-50 text-blue-900",
  };
  const Icon = kind === "error" ? AlertCircle : kind === "success" ? CheckCircle2 : Info;
  return <div role={kind === "error" ? "alert" : "status"} className={`flex items-start gap-2.5 rounded-lg border px-3.5 py-3 text-sm leading-5 ${styles[kind]}`}><Icon className="mt-0.5 shrink-0" size={17} /> <span>{children}</span></div>;
}
