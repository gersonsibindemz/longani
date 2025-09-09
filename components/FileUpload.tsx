import React, { useState, useRef } from 'react';
import { UploadIcon, CheckIcon } from './Icons';

interface FileUploadProps {
  onFileChange: (file: File | null) => void;
  disabled: boolean;
  fileSelected: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileChange, disabled, fileSelected }) => {
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
        className="w-full flex items-center justify-center gap-3 bg-gray-200 text-gray-700 font-medium py-3 px-6 rounded-lg border border-gray-300 hover:bg-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-400 transition-colors duration-300 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600 dark:disabled:bg-gray-800 dark:disabled:text-gray-500"
      >
        {fileSelected ? <CheckIcon className="w-5 h-5 text-green-600 dark:text-green-500" /> : <UploadIcon />}
        <span className="truncate max-w-xs">{fileName}</span>
      </button>
    </div>
  );
};
