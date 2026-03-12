import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  title: "The Null Line | NullTech Repository",
  description: "A Vercel-ready repository for NullTech documents, based on NullBilliards geometry.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body
        className={`${outfit.variable} antialiased selection:bg-accent/30`}
      >
        <div className="photon-glow" />
        {children}
      </body>
    </html>
  );
}
