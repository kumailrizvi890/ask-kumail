import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ask Kumail",
  description: "A RAG assistant and MCP server over Kumail Rizvi's resume and project docs.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
