import { DashboardShell } from "@/components/dashboard/DashboardShell";

export default function UserLayout({ children }: LayoutProps<"/user">) {
  return <DashboardShell variant="user">{children}</DashboardShell>;
}
