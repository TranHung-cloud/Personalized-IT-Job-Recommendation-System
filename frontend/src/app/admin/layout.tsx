import { DashboardShell } from "@/components/dashboard/DashboardShell";

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return <DashboardShell variant="admin">{children}</DashboardShell>;
}
