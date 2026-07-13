import "./globals.css";

export const metadata = {
  title: "Sangu — Kirim pulang, semudah kirim pesan",
  description: "Remittance PMI non-custodial di Stellar.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
