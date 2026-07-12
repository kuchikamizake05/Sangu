export const metadata = {
  title: "Sangu — Kirim pulang, semudah kirim pesan",
  description: "Remittance PMI non-custodial di Stellar.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body style={{ fontFamily: "system-ui, sans-serif", margin: 0, background: "#0b1020", color: "#e8ecf5" }}>
        {children}
      </body>
    </html>
  );
}
