import React, { useRef, useState } from 'react';
import { UploadCloud, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { useI18n } from '../i18n/I18nProvider';

interface FileUploaderProps {
  onFileSelected: (file: File | null) => void;
  acceptedFormats?: string[];
  maxSizeMb?: number;
  label?: string;
  description?: string;
  isProcessing?: boolean;
}

export const FileUploader: React.FC<FileUploaderProps> = ({
  onFileSelected,
  acceptedFormats = ['.pdf', '.docx', '.pptx', '.txt', '.md', '.mp4'],
  maxSizeMb = 50,
  label,
  description,
  isProcessing = false,
}) => {
  const { t, formatFileSize } = useI18n();
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    setError(null);
    const ext = '.' + (file.name.split('.').pop() || '').toLowerCase();
    if (!acceptedFormats.includes(ext)) {
      setError(t('common.upload.unsupported', { ext, allowed: acceptedFormats.join(', ') }));
      setSelectedFile(null);
      onFileSelected(null);
      return;
    }
    if (file.size > maxSizeMb * 1024 * 1024) {
      setError(t('common.upload.tooLarge', { max: maxSizeMb }));
      setSelectedFile(null);
      onFileSelected(null);
      return;
    }
    setSelectedFile(file);
    onFileSelected(file);
  };

  const open = () => !isProcessing && inputRef.current?.click();

  return (
    <div className="w-full">
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept={acceptedFormats.join(',')}
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) handleFile(e.target.files[0]);
          e.target.value = '';
        }}
      />
      <div
        role="button"
        tabIndex={0}
        aria-disabled={isProcessing}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            open();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
        }}
        onClick={open}
        className={`border-2 border-dashed rounded-xl p-6 sm:p-8 text-center cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
          isDragOver ? 'border-indigo-500 bg-indigo-50/50 scale-[1.01]' : 'border-slate-300 hover:border-slate-400 bg-slate-50/50 hover:bg-slate-50'
        }`}
      >
        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
            {isProcessing ? (
              <span className="inline-block animate-spin h-6 w-6 border-2 border-indigo-600 border-t-transparent rounded-full" aria-hidden="true" />
            ) : (
              <UploadCloud className="w-6 h-6" aria-hidden="true" />
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-slate-800">{label ?? t('common.upload.label')}</p>
            <p className="text-xs text-slate-500 mt-1">{description ?? t('common.upload.description', { max: maxSizeMb })}</p>
          </div>
          {selectedFile && (
            <div className="inline-flex items-center space-x-2 px-3 py-1.5 bg-indigo-50 border border-indigo-200 rounded-lg text-xs text-indigo-800 font-medium max-w-full">
              <FileText className="w-4 h-4 text-indigo-600 shrink-0" aria-hidden="true" />
              <span className="truncate">
                {selectedFile.name} ({formatFileSize(selectedFile.size / (1024 * 1024))})
              </span>
              <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" aria-hidden="true" />
            </div>
          )}
        </div>
      </div>
      {error && (
        <div role="alert" className="mt-2 flex items-center space-x-1.5 text-xs text-red-600">
          <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
