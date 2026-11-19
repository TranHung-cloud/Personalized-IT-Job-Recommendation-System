import { DashboardShell } from "@/components/dashboard/DashboardShell";

export default function UserLayout({ children }: LayoutProps<"/match">) {
  return <DashboardShell variant="user">{children}</DashboardShell>;
}
