import { DashboardShell } from "@/components/dashboard/DashboardShell";

export default function UserLayout({ children }: LayoutProps<"/interest">) {
  return <DashboardShell variant="user">{children}</DashboardShell>;
}
