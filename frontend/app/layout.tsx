import type { Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "flag-icons/css/flag-icons.min.css";
import "./globals.css";
import { LocaleProvider } from "@/lib/i18n/locale-context";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-plus-jakarta",
  display: "swap",
});

export const metadata = {
  title: "Sangu — Kirim pulang, semudah kirim pesan",
  description: "Kirim uang ke keluarga di Indonesia — cepat, aman, biaya nyaris nol.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#fcfcfc",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={jakarta.variable}>
      <body><LocaleProvider>{children}</LocaleProvider></body>
    </html>
  );
}
