import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "JobMatch | Việc làm phù hợp với bạn",
    template: "%s | JobMatch",
  },
  description: "Khám phá công việc IT phù hợp với kỹ năng và định hướng nghề nghiệp của bạn.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
