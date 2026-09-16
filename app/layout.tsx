import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "دواجن سنتر | منظومة إدارة وتشغيل وتوزيع الدواجن",
  description: "المنظومة السحابية المتكاملة لإدارة وتوريد الدواجن",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body className="antialiased bg-slate-100 text-slate-800">
        {children}
      </body>
    </html>
  );
}