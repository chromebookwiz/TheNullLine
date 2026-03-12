import fs from 'fs';
import path from 'path';
import { Metadata } from 'next';
import Link from 'next/link';
import { FileText, ArrowLeft, Download } from 'lucide-react';

interface Props {
  params: Promise<{ slug: string }>;
}

const docsDir = path.join(process.cwd(), 'public', 'docs');

export async function generateStaticParams() {
  const files = fs.readdirSync(docsDir);
  return files.map((file) => ({
    slug: file,
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);
  return {
    title: `${decodedSlug} | NullTech Documents`,
    description: `Technical document: ${decodedSlug} from the NullTech repository.`,
  };
}

export default async function DocPage({ params }: Props) {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);
  const filePath = path.join(docsDir, decodedSlug);
  
  let content = "";
  let isTxt = decodedSlug.endsWith('.txt');
  let isDocx = decodedSlug.endsWith('.docx');
  let isPdf = decodedSlug.endsWith('.pdf');

  if (isTxt && fs.existsSync(filePath)) {
    content = fs.readFileSync(filePath, 'utf-8');
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-6 md:p-12 max-w-4xl mx-auto">
      <Link href="/" className="inline-flex items-center gap-2 text-accent hover:opacity-80 transition-opacity mb-8 uppercase text-xs tracking-widest font-bold">
        <ArrowLeft size={16} />
        Back to Orbit
      </Link>

      <div className="glass p-8 rounded-3xl border border-glass-border mb-12">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-accent/20 flex items-center justify-center text-accent">
            <FileText size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{decodedSlug}</h1>
            <p className="opacity-50 text-sm uppercase tracking-widest mt-1">NullTech Document</p>
          </div>
        </div>

        <div className="flex gap-4 mb-8">
          <a 
            href={`/docs/${slug}`} 
            download 
            className="flex items-center gap-2 px-4 py-2 bg-accent/10 border border-accent/20 rounded-full text-xs font-bold hover:bg-accent/20 transition-colors"
          >
            <Download size={14} />
            Download Source
          </a>
        </div>

        {isTxt ? (
          <div className="bg-black/20 p-6 rounded-2xl border border-white/5">
            <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-foreground/80">
              {content}
            </pre>
          </div>
        ) : (
          <div className="bg-black/20 p-12 rounded-2xl border border-white/5 text-center">
            <p className="opacity-60 italic mb-6">This document is in {isDocx ? '.docx' : '.pdf'} format and is best viewed in the repository explorer or by downloading.</p>
            <iframe 
              src={`/docs/${slug}`} 
              className="w-full h-[600px] rounded-lg border border-white/10"
              title={decodedSlug}
            />
          </div>
        )}
      </div>

      <footer className="text-center opacity-30 text-[10px] uppercase tracking-widest pb-12">
        <p>Part of The Null Line Project | Licensed under CC BY 4.0</p>
      </footer>
    </div>
  );
}
