
import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Loader } from './Loader';
import { ClipboardIcon, CheckIcon } from './Icons';

interface TranscriptDisplayProps {
  title: string;
  text: string;
  isLoading: boolean;
  isComplete: boolean;
  placeholder?: string;
  renderAsMarkdown?: boolean;
}

export const TranscriptDisplay: React.FC<TranscriptDisplayProps> = ({ title, text, isLoading, isComplete, placeholder, renderAsMarkdown = false }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (text) {
      navigator.clipboard.writeText(text);
      setCopied(true);
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
        return <span className="text-gray-500">{placeholder || "O resultado aparecerá aqui."}</span>;
    }
    
    if (renderAsMarkdown) {
        return (
            <div className="prose prose-p:text-gray-600 prose-headings:text-gray-800 prose-strong:text-gray-900 prose-ul:text-gray-600 prose-li:marker:text-[#24a9c5] prose-a:text-[#24a9c5] hover:prose-a:text-[#1e8a9f]">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {text}
                </ReactMarkdown>
            </div>
        );
    }

    return (
        <div className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-gray-700">
            {text}
        </div>
    );
  };

  return (
    <div className={`bg-white/60 rounded-xl border border-gray-200 shadow-md transition-all duration-500 ${isComplete ? 'opacity-100' : 'opacity-80'}`}>
      <div className="flex justify-between items-center p-4 border-b border-gray-200">
        <h2 className="text-lg font-medium text-gray-700">{title}</h2>
        {isComplete && (
          <button
            onClick={handleCopy}
            className="p-2 rounded-md hover:bg-gray-200 transition-colors text-gray-500 hover:text-gray-800"
            aria-label="Copiar para a área de transferência"
          >
            {copied ? <CheckIcon className="text-green-500" /> : <ClipboardIcon />}
          </button>
        )}
      </div>
      <div className="p-6 min-h-[300px] relative">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-white/30 rounded-b-xl">
            <Loader className="h-8 w-8 text-[#24a9c5]" />
          </div>
        ) : (
          renderContent()
        )}
      </div>
    </div>
  );
};
