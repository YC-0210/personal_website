import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Knowledge Sphere",
  description:
    "An interactive sphere of the things I've learned and how they connect.",
};

export const viewport: Viewport = {
  themeColor: "#010102",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      {/*
        No `overflow-hidden` here. The Sphere page pins itself with `fixed
        inset-0` and needs no help from the document, whereas every other page —
        the Articles list, an Article, the Trash — is ordinary prose that has to
        scroll. Locking the body locked those too.
      */}
      <body className="bg-canvas text-ink min-h-full font-sans">{children}</body>
    </html>
  );
}
