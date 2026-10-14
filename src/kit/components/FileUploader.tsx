import React, { useRef, useState } from 'react';
import { UploadCloud, FileText, CheckCircle2, AlertCircle } from 'lucide-react';

interface FileUploaderProps {
  onFileSelected: (file: File) => void;
  acceptedFormats?: string[];
  maxSizeMb?: number;
  label?: string;
  description?: string;
  isProcessing?: boolean;
}

export const FileUploader: React.FC<FileUploaderProps> = ({
  onFileSelected,
  acceptedFormats = ['.pdf', '.docx', '.pptx', '.txt', '.md'],
  maxSizeMb = 50,
  label = 'Загрузите учебный материал или регламент',
  description = 'Поддерживаются PDF, DOCX, PPTX, TXT, Markdown (до 50 МБ)',
  isProcessing = false,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    setError(null);
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!acceptedFormats.includes(ext)) {
      setError(`Неподдерживаемый формат файла: ${ext}. Разрешены: ${acceptedFormats.join(', ')}`);
      return;
    }
    if (file.size > maxSizeMb * 1024 * 1024) {
      setError(`Размер файла превышает лимит ${maxSizeMb} МБ`);
      return;
    }
    setSelectedFile(file);
    onFileSelected(file);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="w-full">
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept={acceptedFormats.join(',')}
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
          }
        }}
      />

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
          isDragOver
            ? 'border-indigo-500 bg-indigo-50/50 scale-[1.01]'
            : 'border-slate-300 hover:border-slate-400 bg-slate-50/50 hover:bg-slate-50'
        }`}
      >
        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
            {isProcessing ? (
              <span className="inline-block animate-spin h-6 w-6 border-2 border-indigo-600 border-t-transparent rounded-full" />
            ) : (
              <UploadCloud className="w-6 h-6" />
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-slate-800">{label}</p>
            <p className="text-xs text-slate-500 mt-1">{description}</p>
          </div>
          {selectedFile && (
            <div className="inline-flex items-center space-x-2 px-3 py-1.5 bg-indigo-50 border border-indigo-200 rounded-lg text-xs text-indigo-800 font-medium">
              <FileText className="w-4 h-4 text-indigo-600" />
              <span>{selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(1)} MB)</span>
              <CheckCircle2 className="w-4 h-4 text-green-600" />
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-2 flex items-center space-x-1.5 text-xs text-red-600">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
