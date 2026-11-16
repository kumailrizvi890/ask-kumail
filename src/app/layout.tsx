import type { Metadata } from "next";
import "./globals.css";

const siteUrl = "https://ask-kumail.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Ask Kumail",
  description: "A RAG assistant and MCP server over Kumail Rizvi's resume and project docs.",
  openGraph: {
    title: "Ask Kumail",
    description: "Ask about Kumail's work. Answers come only from his resume and project docs, with citations.",
    url: siteUrl,
    siteName: "Ask Kumail",
    type: "website",
    images: [
      {
        url: `${siteUrl}/og-image.png`,
        width: 1200,
        height: 630,
        alt: "Ask Kumail: ask the bot about Kumail's work",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Ask Kumail",
    description: "Ask about Kumail's work. Answers come only from his resume and project docs, with citations.",
    images: [`${siteUrl}/og-image.png`],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
