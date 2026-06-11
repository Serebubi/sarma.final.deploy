import type { Metadata } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";

import "./globals.css";

const displayFont = Cormorant_Garamond({
  subsets: ["latin", "cyrillic"],
  variable: "--font-display",
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
});

const bodyFont = Manrope({
  subsets: ["latin", "cyrillic"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "SUPERBOX",
  description: "Сервис оформления заказов SUPERBOX",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className={`${displayFont.variable} ${bodyFont.variable} font-[family-name:var(--font-body)] antialiased`}>
        {children}
      </body>
    </html>
  );
}
