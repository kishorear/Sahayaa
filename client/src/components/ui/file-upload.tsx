import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, X, File as FileIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface FileUploadProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onFileSelect: (file: File | null) => void;
  currentFile: File | null;
  label?: string;
  acceptedFileTypes?: string;
  maxSize?: number; // in MB
  className?: string;
}

export function FileUpload({
  onFileSelect,
  currentFile,
  label = 'Upload a file',
  acceptedFileTypes = '.txt,.pdf,.doc,.docx,.md',
  maxSize = 10, // Default max size 10MB
  className,
  ...props
}: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File | null) => {
    if (!file) {
      onFileSelect(null);
      setError(null);
      return;
    }

    // Validate file type
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    const isFileTypeValid = acceptedFileTypes.includes(fileExtension);
    
    // Validate file size
    const maxSizeBytes = maxSize * 1024 * 1024;
    const isFileSizeValid = file.size <= maxSizeBytes;

    if (!isFileTypeValid) {
      setError(`Invalid file type. Accepted types: ${acceptedFileTypes}`);
      return;
    }

    if (!isFileSizeValid) {
      setError(`File size exceeds the maximum limit of ${maxSize}MB`);
      return;
    }

    setError(null);
    onFileSelect(file);
  };

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleButtonClick = () => {
    inputRef.current?.click();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleRemoveFile = () => {
    onFileSelect(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  return (
    <div className={cn("w-full", className)}>
      <Input
        ref={inputRef}
        type="file"
        accept={acceptedFileTypes}
        onChange={handleInputChange}
        className="hidden"
        {...props}
      />
      {!currentFile ? (
        <div
          className={cn(
            "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
            dragActive
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50 hover:bg-accent",
          )}
          onClick={handleButtonClick}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <div className="flex flex-col items-center justify-center space-y-2">
            <Upload className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium">{label}</p>
            <p className="text-xs text-muted-foreground">
              Drag & drop a file here or click to browse
            </p>
            <p className="text-xs text-muted-foreground">
              Max file size: {maxSize}MB
            </p>
            <p className="text-xs text-muted-foreground">
              Supported formats: {acceptedFileTypes}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between border rounded-lg p-3">
          <div className="flex items-center space-x-3">
            <FileIcon className="h-6 w-6 text-primary" />
            <div className="text-sm">
              <p className="font-medium truncate max-w-[200px]">{currentFile.name}</p>
              <p className="text-xs text-muted-foreground">
                {(currentFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={handleRemoveFile}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Remove file</span>
          </Button>
        </div>
      )}
      {error && <p className="text-destructive text-sm mt-2">{error}</p>}
    </div>
  );
}