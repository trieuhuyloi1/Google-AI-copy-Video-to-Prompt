import React, { useCallback, useState } from 'react';
import { Upload, AlertCircle } from 'lucide-react';

export interface ProcessedVideoData {
  file: File;
  previewUrl: string;
  base64Data: string;
  mimeType: string;
}

interface VideoUploaderProps {
  onVideosSelected: (videos: ProcessedVideoData[]) => void;
  disabled?: boolean;
  currentCount: number;
  maxCount: number;
}

const MAX_SIZE_MB = 100;

export const VideoUploader: React.FC<VideoUploaderProps> = ({ 
  onVideosSelected, 
  disabled, 
  currentCount, 
  maxCount 
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const processFiles = async (files: FileList | File[]) => {
    setError(null);
    setIsProcessing(true);

    const remainingSlots = maxCount - currentCount;
    if (remainingSlots <= 0) {
      setError(`Bạn đã đạt giới hạn ${maxCount} video.`);
      setIsProcessing(false);
      return;
    }

    const fileArray = Array.from(files).slice(0, remainingSlots);
    const validFiles: ProcessedVideoData[] = [];
    let errorMsg = null;

    const readFile = (file: File): Promise<ProcessedVideoData> => {
      return new Promise((resolve, reject) => {
        if (!file.type.startsWith('video/')) {
          reject(new Error(`File "${file.name}" không phải là video.`));
          return;
        }
        if (file.size > MAX_SIZE_MB * 1024 * 1024) {
          reject(new Error(`File "${file.name}" quá lớn (> ${MAX_SIZE_MB}MB).`));
          return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target?.result as string;
          const base64Data = result.split(',')[1];
          resolve({
            file,
            previewUrl: URL.createObjectURL(file),
            base64Data,
            mimeType: file.type
          });
        };
        reader.onerror = () => reject(new Error(`Lỗi đọc file "${file.name}".`));
        reader.readAsDataURL(file);
      });
    };

    try {
      const results = await Promise.allSettled(fileArray.map(readFile));
      
      results.forEach((res) => {
        if (res.status === 'fulfilled') {
          validFiles.push(res.value);
        } else {
          // Keep the last error message for display
          errorMsg = res.reason.message;
        }
      });

      if (validFiles.length > 0) {
        onVideosSelected(validFiles);
      }
      if (errorMsg) {
        setError(errorMsg + (validFiles.length > 0 ? " Các file hợp lệ khác đã được thêm." : ""));
      }
    } catch (err) {
      setError("Có lỗi xảy ra khi xử lý file.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && !disabled && !isProcessing) {
      processFiles(e.dataTransfer.files);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled, isProcessing, currentCount]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && !disabled && !isProcessing) {
      processFiles(e.target.files);
    }
    // Reset value to allow selecting same file again if needed (though rare for batch)
    e.target.value = '';
  };

  return (
    <div className="w-full">
      <div 
        className={`relative group flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl transition-all duration-300 ease-in-out
          ${dragActive ? 'border-blue-500 bg-blue-500/10' : 'border-slate-600 bg-slate-800/50 hover:bg-slate-800 hover:border-blue-400'}
          ${disabled || isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input 
          type="file" 
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed" 
          onChange={handleChange}
          accept="video/*"
          multiple
          disabled={disabled || isProcessing}
        />
        
        <div className="flex flex-col items-center justify-center pt-2 pb-3 text-center px-4">
          <Upload className={`w-8 h-8 mb-2 ${dragActive ? 'text-blue-400' : 'text-slate-400'}`} />
          <p className="text-xs text-slate-300 font-medium">
            <span className="font-semibold text-blue-400">Click tải lên</span> hoặc kéo thả
          </p>
          <p className="text-[10px] text-slate-500 mt-1">
             Max {maxCount} videos • {MAX_SIZE_MB}MB/file
          </p>
        </div>
      </div>

      {error && (
        <div className="mt-2 flex items-center p-2 text-xs text-red-400 bg-red-900/20 border border-red-900/50 rounded-lg animate-fadeIn">
          <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
};