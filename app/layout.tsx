import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pulso — sua rotina fitness em um só lugar",
  description: "Organize treinos, alimentação e hábitos com ferramentas simples para acompanhar sua evolução.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">{children}</body>
    </html>
  );
}
