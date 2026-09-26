import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ثُلَاث | منظومة إدارة الأنشطة التجارية",
  description: "منظومة سحابية متكاملة لإدارة الأنشطة التجارية والتوريد والتوزيع",
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