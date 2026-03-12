"use client";

import React, { useState, useEffect } from 'react';
import mammoth from 'mammoth';
import { X, ExternalLink, FileText, Download, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type FileType = 'txt' | 'docx' | 'pdf' | 'app' | 'folder';

interface NullFile {
  name: string;
  type: FileType;
  path: string;
  children?: NullFile[];
}

interface ViewerProps {
  file: NullFile;
  onClose?: () => void;
  embedded?: boolean;
}

const DocumentViewerComponent = ({ file, onClose, embedded }: ViewerProps) => {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setContent(null);

    if (file.type === 'txt') {
      fetch(file.path)
        .then(res => res.text())
        .then(text => {
          setContent(text);
          setLoading(false);
        })
        .catch(err => {
          setError("◊.ERR_Σ");
          setLoading(false);
        });
    } else if (file.type === 'docx') {
      fetch(file.path)
        .then(res => res.arrayBuffer())
        .then(buffer => mammoth.convertToHtml({ arrayBuffer: buffer }))
        .then(result => {
          setContent(result.value);
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          setError("◊.ERR_Δ");
          setLoading(false);
        });
    } else if (file.type === 'folder') {
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, [file]);

  const innerContent = (
    <div className={cn(
      "flex-1 p-6 md:p-12 bg-white min-h-0",
      embedded ? "h-auto overflow-visible" : "overflow-y-auto h-full"
    )}>
      {loading ? (
        <div className="h-full flex items-center justify-center">
          <Loader2 className="animate-spin text-black/20" size={32} />
        </div>
      ) : error ? (
        <div className="h-full flex flex-col items-center justify-center text-red-600 gap-4">
          <X size={48} />
          <p>{error}</p>
        </div>
      ) : file.type === 'pdf' ? (
        <embed 
          src={`${file.path}#toolbar=0&navpanes=0&scrollbar=0`}
          type="application/pdf"
          className="w-full h-full rounded-lg border-none bg-white min-h-[500px]"
        />
      ) : file.type === 'docx' ? (
        <div 
          className="prose max-w-none docx-content text-black/90 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: content || '' }} 
        />
      ) : file.type === 'folder' ? (
        <div className="font-mono text-[13px] text-black/80 bg-yellow-50/40 border border-yellow-200 rounded-lg p-6 mt-2">
          <div className="mb-2 text-[11px] text-yellow-700">Decompiled Folder Structure (LaTeX-style):</div>
          <pre className="whitespace-pre-wrap">
            {renderFolderLatex(file)}
          </pre>
        </div>
      ) : (
        /* Hybrid TXT/HTML rendering */
        (() => {
          const isHTML = content && (/<[a-z][\s\S]*>/i.test(content));
          if (isHTML) {
            return (
              <div 
                className="prose max-w-none text-black/90 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: content || '' }} 
              />
            );
          }
          return (
            <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-black/80">
              {content}
            </pre>
          );
        })()
      )}
    // Render folder as LaTeX-style tree
    function renderFolderLatex(file: NullFile, indent = 0): string {
      const pad = '  '.repeat(indent);
      let out = `${pad}\\textbf{${file.name}} \\textit{[folder]}`;
      if (file.children && file.children.length > 0) {
        for (const child of file.children) {
          if (child.type === 'folder') {
            out += `\n${renderFolderLatex(child, indent + 1)}`;
          } else {
            out += `\n${'  '.repeat(indent + 1)}- ${child.name} \\texttt{[${child.type}]}`;
          }
        }
      }
      return out;
    }
    </div>
  );

  if (embedded) {
    return innerContent;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-white/95 backdrop-blur-2xl"
    >
      <motion.div
        initial={{ scale: 0.98, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.98, opacity: 0 }}
        className="w-full max-w-5xl h-[85vh] esoteric-glass rounded-3xl overflow-hidden flex flex-col relative border border-black/20 shadow-[0_0_100px_rgba(0,0,0,0.15)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 md:px-8 flex items-center justify-between border-b border-black/5 bg-white shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-full border border-black/20 flex items-center justify-center text-black/60">
              <FileText size={16} />
            </div>
            <div>
              <h2 className="font-light text-sm tracking-widest uppercase text-black/80">{file.name}</h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a 
              href={`/docs/${encodeURIComponent(file.path.split('/').pop() || '')}`} 
              target="_blank"
              className="p-2 hover:bg-black/5 rounded-full transition-colors opacity-60 hover:opacity-100"
              title="Direct Link (SEO)"
            >
              <ExternalLink size={20} />
            </a>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-black/10 rounded-full text-black/40 hover:text-black transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>
        {innerContent}
      </motion.div>
    </motion.div>
  );
};

const DocumentViewer = React.memo(DocumentViewerComponent);
DocumentViewer.displayName = 'DocumentViewer';

export default DocumentViewer;
