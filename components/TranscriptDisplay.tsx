import React, { useState, useEffect, useRef } from 'react';
import { Loader } from './Loader';
import { ClipboardIcon, CheckIcon, ChevronDownIcon } from './Icons';

interface TranscriptDisplayProps {
  title: string;
  text: string;
  isLoading: boolean;
  isComplete: boolean;
  placeholder?: string;
  renderAsHTML?: boolean;
  isExpanded: boolean;
  isClickable: boolean;
  onToggle: () => void;
  audioUrl?: string | null;
}

export const TranscriptDisplay: React.FC<TranscriptDisplayProps> = ({ title, text, isLoading, isComplete, placeholder, renderAsHTML = false, isExpanded, isClickable, onToggle, audioUrl }) => {
  const [copied, setCopied] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const handleCopy = () => {
    if (!text || !contentRef.current) return;

    if (renderAsHTML) {
      const plainText = contentRef.current.innerText;
      try {
        if (typeof ClipboardItem === 'undefined') {
          throw new Error('ClipboardItem API not available.');
        }
        const htmlBlob = new Blob([text], { type: 'text/html' });
        const textBlob = new Blob([plainText], { type: 'text/plain' });
        const item = new ClipboardItem({
          'text/html': htmlBlob,
          'text/plain': textBlob,
        });
        navigator.clipboard.write([item]).then(() => setCopied(true));
      } catch (error) {
        console.warn('Rich text copy failed, falling back to plain text:', error);
        navigator.clipboard.writeText(plainText).then(() => setCopied(true));
      }
    } else {
      navigator.clipboard.writeText(text).then(() => setCopied(true));
    }
  };

  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  const renderContent = () => {
    if (!text && !isLoading) {
        return <span className="text-gray-500 dark:text-gray-400">{placeholder || "O resultado aparecerá aqui."}</span>;
    }
    
    if (renderAsHTML) {
        return (
            <div
                ref={contentRef}
                className="prose prose-p:text-gray-600 prose-headings:text-gray-800 prose-strong:text-gray-900 prose-ul:text-gray-600 prose-li:marker:text-[#24a9c5] prose-a:text-[#24a9c5] hover:prose-a:text-[#1e8a9f] dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: text }}
            />
        );
    }
    
    // For the raw transcript, normalize newline characters to create consistent spacing.
    // This ensures there is a single blank line between paragraphs, improving readability.
    const formattedText = text.replace(/\n+/g, '\n\n');

    return (
        <div ref={contentRef} className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-gray-700 dark:text-gray-300">
            {formattedText}
        </div>
    );
  };

  return (
    <div className={`bg-white/60 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700 shadow-md transition-all duration-500 ${isComplete ? 'opacity-100' : 'opacity-80'}`}>
      <div
        onClick={isClickable ? onToggle : undefined}
        onKeyDown={isClickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') onToggle(); } : undefined}
        role={isClickable ? "button" : undefined}
        tabIndex={isClickable ? 0 : -1}
        aria-expanded={isExpanded}
        className={`flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700 ${isClickable ? 'cursor-pointer' : ''}`}
      >
        <h2 className="text-lg font-medium text-gray-700 dark:text-gray-300">{title}</h2>
        <div className="flex items-center gap-2">
            {isComplete && (
            <button
                onClick={(e) => { e.stopPropagation(); handleCopy(); }}
                className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                aria-label="Copiar para a área de transferência"
            >
                {copied ? <CheckIcon className="text-green-500" /> : <ClipboardIcon />}
            </button>
            )}
            {isClickable && <ChevronDownIcon className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />}
        </div>
      </div>
      <div className={`transition-[max-height] duration-500 ease-in-out overflow-hidden ${isExpanded ? 'max-h-[150vh]' : 'max-h-0'}`}>
        {audioUrl && (
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <audio controls src={audioUrl} className="w-full h-10">
              O seu navegador não suporta o elemento de áudio.
            </audio>
          </div>
        )}
        <div className={`p-6 relative ${isExpanded ? 'min-h-[300px]' : ''}`}>
            {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-white/30 dark:bg-gray-900/50 rounded-b-xl">
                <Loader className="h-8 w-8 text-[#24a9c5]" />
            </div>
            ) : (
            renderContent()
            )}
        </div>
      </div>
    </div>
  );
};
