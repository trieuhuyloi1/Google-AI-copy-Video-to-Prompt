import React from 'react';
import { Copy, Download, Film, FileText, Check, ListVideo } from 'lucide-react';
import { AnalysisResult } from '../types';

interface AnalysisResultProps {
  result: AnalysisResult;
}

export const AnalysisResultView: React.FC<AnalysisResultProps> = ({ result }) => {
  const [copiedIndex, setCopiedIndex] = React.useState<number | null>(null);

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleDownloadTxt = () => {
    // Generate text content: Prompts separated by empty line
    const content = result.prompts.join('\n\n');
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'video_prompts.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Helper to render Vietnamese content with highlighted Scene headers
  const renderVietnameseContent = (fullText: string) => {
    const cleanText = fullText.replace(/--- PROMPTS_EXPORT_START ---[\s\S]*?--- PROMPTS_EXPORT_END ---/, '');
    const lines = cleanText.split('\n');

    return lines.map((line, index) => {
      // Check for Scene headers: Starts with "Cảnh", "**Cảnh", "Scene"
      const isSceneHeader = /^((\*\*|#|)?\s*(Cảnh|Scene)\s+\d+|Phân cảnh \d+)/i.test(line.trim());
      
      if (isSceneHeader) {
        return (
          <div key={index} className="mt-6 mb-2 pt-2 border-t border-slate-700/50">
            <h4 className="text-blue-300 font-bold text-base flex items-center gap-2">
              <ListVideo className="w-4 h-4" />
              {line.replace(/\*\*/g, '')}
            </h4>
          </div>
        );
      }
      
      // Regular text
      return (
        <p key={index} className="min-h-[1.5em] text-slate-300 leading-relaxed">
          {line.replace(/\*\*/g, '')}
        </p>
      );
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
      {/* Left Column: Full Analysis (Vietnamese) */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700 flex flex-col h-[600px] lg:h-auto overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-700 bg-slate-800/80 backdrop-blur-sm sticky top-0 flex items-center gap-2 z-10">
          <FileText className="w-5 h-5 text-blue-400" />
          <h3 className="font-semibold text-white">Chi tiết Phân tích (Tiếng Việt)</h3>
        </div>
        <div className="p-5 overflow-y-auto flex-1 custom-scrollbar bg-slate-900/30">
          <div className="text-sm">
            {renderVietnameseContent(result.fullText)}
          </div>
        </div>
      </div>

      {/* Right Column: Prompts List (English) */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700 flex flex-col h-[600px] lg:h-auto overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-700 bg-slate-800/80 backdrop-blur-sm sticky top-0 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <Film className="w-5 h-5 text-purple-400" />
            <h3 className="font-semibold text-white">Prompts Tạo Video (English)</h3>
            <span className="bg-purple-500/20 text-purple-300 text-xs px-2 py-0.5 rounded-full border border-purple-500/30">
              {result.prompts.length}
            </span>
          </div>
          <button 
            onClick={handleDownloadTxt}
            disabled={result.prompts.length === 0}
            className="flex items-center gap-1.5 text-xs bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-slate-600 hover:border-slate-500"
          >
            <Download className="w-3.5 h-3.5" />
            Export .txt
          </button>
        </div>
        
        <div className="p-4 overflow-y-auto flex-1 custom-scrollbar space-y-3">
          {result.prompts.length > 0 ? (
            result.prompts.map((prompt, index) => (
              <div 
                key={index} 
                className="group p-3 bg-slate-900/50 border border-slate-700/50 rounded-lg hover:border-purple-500/50 transition-colors flex gap-3"
              >
                <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded bg-slate-800 text-xs font-mono text-slate-400 border border-slate-700">
                  {index + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-300 font-light leading-relaxed whitespace-pre-wrap break-words">
                    {prompt}
                  </p>
                </div>
                <button 
                  onClick={() => handleCopy(prompt, index)}
                  className="flex-shrink-0 self-start p-1.5 text-slate-500 hover:text-white hover:bg-slate-700 rounded transition-colors"
                  title="Copy prompt"
                >
                  {copiedIndex === index ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 text-sm">
              <p>Chưa tìm thấy danh sách prompt.</p>
              <p className="text-xs opacity-70 mt-1">Hệ thống đang phân tích...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};