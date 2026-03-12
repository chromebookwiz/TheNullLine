"use client";

import React, { useState, useEffect } from 'react';
import mammoth from 'mammoth';
import { X, ExternalLink, FileText, Download, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ViewerProps {
  file: {
    name: string;
    type: 'txt' | 'docx' | 'pdf' | 'app';
    path: string;
  };
  onClose: () => void;
}

export default function DocumentViewer({ file, onClose }: ViewerProps) {
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
          setError("Failed to load text file.");
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
          setError("Failed to convert DOCX file.");
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [file]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-black/60 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="w-full max-w-5xl h-[85vh] glass rounded-3xl overflow-hidden flex flex-col relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 md:px-8 flex items-center justify-between border-b border-glass-border bg-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center text-accent">
              <FileText size={20} />
            </div>
            <div>
              <h2 className="font-semibold text-lg leading-tight">{file.name}</h2>
              <p className="text-xs opacity-50 uppercase tracking-widest">{file.type} document</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a 
              href={`/docs/${encodeURIComponent(file.path.split('/').pop() || '')}`} 
              target="_blank"
              className="p-2 hover:bg-white/10 rounded-full transition-colors opacity-60 hover:opacity-100"
              title="Direct Link (SEO)"
            >
              <ExternalLink size={20} />
            </a>
            <a 
              href={file.path} 
              download 
              className="p-2 hover:bg-white/10 rounded-full transition-colors opacity-60 hover:opacity-100"
              title="Download"
            >
              <Download size={20} />
            </a>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-12 custom-scrollbar bg-black/20">
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="animate-spin text-accent" size={48} />
            </div>
          ) : error ? (
            <div className="h-full flex flex-col items-center justify-center text-red-400 gap-4">
              <X size={48} />
              <p>{error}</p>
            </div>
          ) : file.type === 'pdf' ? (
            <iframe 
              src={file.path} 
              className="w-full h-full rounded-lg border-none bg-white/5"
              title={file.name}
            />
          ) : file.type === 'docx' ? (
            <div 
              className="prose prose-invert max-w-none docx-content text-foreground/90 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: content || '' }} 
            />
          ) : (
            <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-foreground/80">
              {content}
            </pre>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
