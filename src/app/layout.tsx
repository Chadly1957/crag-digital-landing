import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SEO Rank Analyzer",
  description: "Analyze any website's SEO score — on-page, technical, local SEO, and SERP rankings",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
