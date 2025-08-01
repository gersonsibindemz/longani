import React, { useState, useRef } from 'react';
import { UploadIcon } from './Icons';

interface FileUploadProps {
  onFileChange: (file: File | null) => void;
  disabled: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileChange, disabled }) => {
  const [fileName, setFileName] = useState<string>('Escolher ficheiro');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFileName(file.name);
      onFileChange(file);
    } else {
      setFileName('Escolher ficheiro');
      onFileChange(null);
    }
  };
  
  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full sm:w-auto">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="audio/*"
        disabled={disabled}
      />
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        className="w-full flex items-center justify-center gap-3 bg-gray-200 text-gray-700 font-medium py-3 px-6 rounded-lg border border-gray-300 hover:bg-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-400 transition-colors duration-300"
      >
        <UploadIcon />
        <span className="truncate max-w-xs">{fileName}</span>
      </button>
    </div>
  );
};