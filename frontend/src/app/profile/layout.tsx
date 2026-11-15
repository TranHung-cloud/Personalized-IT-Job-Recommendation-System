import { DashboardShell } from "@/components/dashboard/DashboardShell";

export default function ProfileLayout({ children }: LayoutProps<"/profile">) {
  return <DashboardShell variant="user">{children}</DashboardShell>;
}
