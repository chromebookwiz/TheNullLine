import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import fs from 'fs';
import path from 'path';

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "700"],   // only the weights actually used in the UI
  variable: "--font-outfit",
  display: "swap",
  fallback: ["system-ui", "sans-serif"],
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
  // Server-side: read all docs files for scraper/AI discovery
  const docsDir = path.join(process.cwd(), 'public', 'docs');
  let docFiles: string[] = [];
  try {
    docFiles = fs.readdirSync(docsDir).filter(f => f.endsWith('.txt'));
  } catch {}

  return (
    <html lang="en">
      <body
        className={`${outfit.variable} antialiased selection:bg-black/10`}
      >
        {/* Server-rendered hidden links for scrapers/AI indexing */}
        <nav aria-label="NullTech documents" className="sr-only">
          <ul>
            {docFiles.map(file => (
              <li key={file}>
                <a href={`/docs/${encodeURIComponent(file)}`}>{file.replace('.txt', '')}</a>
              </li>
            ))}
          </ul>
        </nav>
        {children}
      </body>
    </html>
  );
}
