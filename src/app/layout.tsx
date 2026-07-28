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
      <body className="bg-canvas text-ink h-full overflow-hidden font-sans">
        {children}
      </body>
    </html>
  );
}
