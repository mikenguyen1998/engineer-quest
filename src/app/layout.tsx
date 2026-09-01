import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Engineer Quest — an engineering practice system",
  description: "A full-stack engineering practice app with challenge paths, evidence capture, live code previews, and progression tracking.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
