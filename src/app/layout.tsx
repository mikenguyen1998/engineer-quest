import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Engineer Quest",
  description: "A personal engineering practice system.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
