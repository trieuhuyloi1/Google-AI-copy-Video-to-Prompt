import React, { useState } from 'react';
import { VideoUploader, ProcessedVideoData } from './components/VideoUploader';
import { AnalysisResultView } from './components/AnalysisResult';
import { analyzeVideoContent } from './services/geminiService';
import { VideoSession, AnalysisStatus } from './types';
import { Bot, Sparkles, Trash2, CheckCircle2, AlertCircle, Loader2, PlayCircle, Plus, Download } from 'lucide-react';

const MAX_VIDEOS = 20;

function App() {
  const [videos, setVideos] = useState<VideoSession[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [customInstruction, setCustomInstruction] = useState<string>("");
  const [isGlobalAnalyzing, setIsGlobalAnalyzing] = useState(false);

  const handleVideosSelected = (newFiles: ProcessedVideoData[]) => {
    const newSessions: VideoSession[] = newFiles.map(data => ({
      id: crypto.randomUUID(),
      ...data,
      status: 'IDLE',
      result: null
    }));

    setVideos(prev => {
      // Calculate how many we can actually add
      const available = MAX_VIDEOS - prev.length;
      const toAdd = newSessions.slice(0, available);
      const updated = [...prev, ...toAdd];
      
      // If nothing was selected, select the first new one
      if (!selectedId && toAdd.length > 0) {
        setSelectedId(toAdd[0].id);
      }
      return updated;
    });
  };

  const handleRemoveVideo = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setVideos(prev => {
      const updated = prev.filter(v => v.id !== id);
      // If we removed the selected video, select another one if available
      if (selectedId === id) {
        setSelectedId(updated.length > 0 ? updated[0].id : null);
      }
      // Cleanup object URL
      const removed = prev.find(v => v.id === id);
      if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl);
      return updated;
    });
  };

  const updateVideoStatus = (id: string, status: AnalysisStatus, result: any = null, error: string = "") => {
    setVideos(prev => prev.map(v => 
      v.id === id ? { ...v, status, result, error } : v
    ));
  };

  const analyzeSingleVideo = async (video: VideoSession) => {
    updateVideoStatus(video.id, 'ANALYZING');
    try {
      const analysis = await analyzeVideoContent(
        video.base64Data,
        video.mimeType,
        customInstruction
      );
      updateVideoStatus(video.id, 'COMPLETED', analysis);
    } catch (err: any) {
      console.error(err);
      updateVideoStatus(video.id, 'ERROR', null, err.message || "Lỗi không xác định");
    }
  };

  const handleAnalyzeAll = async () => {
    const idleVideos = videos.filter(v => v.status === 'IDLE' || v.status === 'ERROR');
    if (idleVideos.length === 0) return;

    setIsGlobalAnalyzing(true);
    
    // We execute them in parallel but independent promises
    const promises = idleVideos.map(v => analyzeSingleVideo(v));
    
    await Promise.allSettled(promises);
    setIsGlobalAnalyzing(false);
  };

  const handleExportAllPrompts = () => {
    const completedVideos = videos.filter(v => v.status === 'COMPLETED' && v.result);
    if (completedVideos.length === 0) return;

    // Collect one prompt line per video
    const allPrompts: string[] = [];
    
    completedVideos.forEach(v => {
      if (v.result && v.result.prompts && v.result.prompts.length > 0) {
         // Combine all prompts for this video into one single line (handling case where there might still be multiple)
         const videoPrompt = v.result.prompts.join(' ').replace(/\s+/g, ' ').trim();
         allPrompts.push(videoPrompt);
      }
    });

    if (allPrompts.length === 0) {
      alert("Không có prompt nào để xuất.");
      return;
    }

    // Join with single newline so each prompt is exactly one line
    const content = allPrompts.join('\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ExportALL.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const selectedVideo = videos.find(v => v.id === selectedId);
  const hasCompletedVideos = videos.some(v => v.status === 'COMPLETED');

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-gradient-to-tr from-blue-500 to-purple-500 p-2 rounded-lg shadow-lg shadow-blue-500/20">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-xl tracking-tight text-white">
                Gemini <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">Video Analyst</span>
              </h1>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">AI Assistant for Video Recreation</p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-6">
            {/* Logo and Facebook Link */}
            <a 
              href="https://facebook.com/loivn.98" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-3 bg-slate-800/50 hover:bg-slate-800 px-3 py-1.5 rounded-full border border-slate-700/50 hover:border-blue-500/30 transition-all group"
            >
              <img 
                src="https://i.ibb.co/C07Bf5R/462551469-866468792348545-2347271811802951792-n.png" 
                alt="LoiAI Logo" 
                className="w-6 h-6 rounded-full object-cover"
              />
              <span className="text-xs font-medium text-slate-300 group-hover:text-blue-300 transition-colors">
                Facebook.com/loivn.98
              </span>
            </a>

            <div className="w-px h-6 bg-slate-800"></div>

            <div className="text-sm font-medium text-slate-400">
               <span>Batch Mode: Max {MAX_VIDEOS} Videos</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto p-4 lg:p-6 h-[calc(100vh-64px)] overflow-hidden">
        <div className="grid grid-cols-12 gap-6 h-full">
          
          {/* LEFT SIDEBAR: LIST & UPLOAD */}
          <div className="col-span-12 lg:col-span-4 flex flex-col gap-4 h-full overflow-hidden">
            
            {/* Control Panel */}
            <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-4 flex flex-col gap-4 shadow-xl">
              <div className="flex justify-between items-center">
                 <h2 className="font-semibold text-slate-200 flex items-center gap-2">
                   Danh sách Video <span className="text-slate-500 text-xs font-normal">({videos.length}/{MAX_VIDEOS})</span>
                 </h2>
                 {videos.length > 0 && (
                   <button 
                     onClick={() => setVideos([])} 
                     className="text-xs text-red-400 hover:text-red-300 hover:underline"
                     disabled={isGlobalAnalyzing}
                   >
                     Xóa tất cả
                   </button>
                 )}
              </div>

              {videos.length < MAX_VIDEOS && (
                <VideoUploader 
                  onVideosSelected={handleVideosSelected} 
                  disabled={isGlobalAnalyzing} 
                  currentCount={videos.length}
                  maxCount={MAX_VIDEOS}
                />
              )}

              {/* Custom Instruction - Apply to all */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5 ml-1">
                  Yêu cầu chung cho AI (Tùy chọn)
                </label>
                <textarea
                  value={customInstruction}
                  onChange={(e) => setCustomInstruction(e.target.value)}
                  placeholder="VD: Tập trung mô tả chi tiết màu sắc, ánh sáng..."
                  className="w-full bg-slate-900/80 border border-slate-600 rounded-lg px-3 py-2 text-xs text-slate-200 focus:ring-1 focus:ring-blue-500 outline-none resize-none h-16 placeholder:text-slate-600"
                  disabled={isGlobalAnalyzing}
                />
              </div>

              <div className="flex flex-col gap-2">
                <button
                  onClick={handleAnalyzeAll}
                  disabled={isGlobalAnalyzing || videos.length === 0 || !videos.some(v => v.status === 'IDLE' || v.status === 'ERROR')}
                  className={`w-full py-3 px-4 rounded-xl font-bold text-white shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95
                    ${isGlobalAnalyzing || videos.length === 0 || !videos.some(v => v.status === 'IDLE' || v.status === 'ERROR')
                      ? 'bg-slate-700 text-slate-400 cursor-not-allowed shadow-none' 
                      : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 shadow-blue-900/20'
                    }
                  `}
                >
                  {isGlobalAnalyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Đang xử lý {videos.filter(v => v.status === 'ANALYZING').length} video...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Phân tích Tất cả ({videos.filter(v => v.status === 'IDLE').length})</span>
                    </>
                  )}
                </button>

                {hasCompletedVideos && (
                  <button
                    onClick={handleExportAllPrompts}
                    disabled={isGlobalAnalyzing}
                    className="w-full py-2 px-4 rounded-xl border border-green-600/50 bg-green-600/10 hover:bg-green-600/20 text-green-300 font-medium text-sm transition-all flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    ExportALL.txt ({videos.filter(v => v.status === 'COMPLETED').length})
                  </button>
                )}
              </div>
            </div>

            {/* Video List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1">
              {videos.length === 0 ? (
                <div className="h-40 flex flex-col items-center justify-center text-slate-600 border border-dashed border-slate-800 rounded-xl bg-slate-800/20">
                  <PlayCircle className="w-8 h-8 mb-2 opacity-50" />
                  <p className="text-sm">Chưa có video nào</p>
                </div>
              ) : (
                videos.map((video) => (
                  <div 
                    key={video.id}
                    onClick={() => setSelectedId(video.id)}
                    className={`group relative flex items-center gap-3 p-2 rounded-xl border transition-all cursor-pointer hover:bg-slate-800
                      ${selectedId === video.id 
                        ? 'bg-slate-800 border-blue-500/50 shadow-md shadow-blue-900/10' 
                        : 'bg-slate-800/40 border-slate-700/50 hover:border-slate-600'
                      }
                    `}
                  >
                    {/* Thumbnail */}
                    <div className="relative w-20 h-14 bg-black rounded-lg overflow-hidden flex-shrink-0 border border-slate-700">
                      <video src={video.previewUrl} className="w-full h-full object-cover" />
                      {video.status === 'COMPLETED' && (
                        <div className="absolute inset-0 bg-green-900/60 flex items-center justify-center backdrop-blur-[1px]">
                          <CheckCircle2 className="w-5 h-5 text-green-400" />
                        </div>
                      )}
                      {video.status === 'ANALYZING' && (
                        <div className="absolute inset-0 bg-blue-900/60 flex items-center justify-center backdrop-blur-[1px]">
                          <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                        </div>
                      )}
                      {video.status === 'ERROR' && (
                         <div className="absolute inset-0 bg-red-900/60 flex items-center justify-center backdrop-blur-[1px]">
                           <AlertCircle className="w-5 h-5 text-red-400" />
                         </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${selectedId === video.id ? 'text-blue-200' : 'text-slate-300'}`}>
                        {video.file.name}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium
                          ${video.status === 'IDLE' ? 'bg-slate-700 text-slate-400' : ''}
                          ${video.status === 'ANALYZING' ? 'bg-blue-500/20 text-blue-300' : ''}
                          ${video.status === 'COMPLETED' ? 'bg-green-500/20 text-green-300' : ''}
                          ${video.status === 'ERROR' ? 'bg-red-500/20 text-red-300' : ''}
                        `}>
                          {video.status === 'IDLE' && 'Sẵn sàng'}
                          {video.status === 'ANALYZING' && 'Đang phân tích...'}
                          {video.status === 'COMPLETED' && 'Hoàn tất'}
                          {video.status === 'ERROR' && 'Lỗi'}
                        </span>
                        <span className="text-xs text-slate-600">
                          {(video.file.size / 1024 / 1024).toFixed(1)}MB
                        </span>
                      </div>
                    </div>

                    {/* Delete Action */}
                    <button 
                      onClick={(e) => handleRemoveVideo(e, video.id)}
                      className="opacity-0 group-hover:opacity-100 p-2 text-slate-500 hover:text-red-400 hover:bg-slate-700/50 rounded-lg transition-all"
                      title="Xóa video"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* RIGHT MAIN AREA: SELECTED VIDEO DETAIL */}
          <div className="col-span-12 lg:col-span-8 flex flex-col h-full overflow-hidden bg-slate-800/30 rounded-2xl border border-slate-700/50">
            {selectedVideo ? (
              <div className="flex flex-col h-full">
                {/* Detail Header */}
                <div className="p-4 border-b border-slate-700/50 bg-slate-900/50 flex justify-between items-center">
                  <h3 className="font-semibold text-slate-200 truncate max-w-md">
                    {selectedVideo.file.name}
                  </h3>
                  {selectedVideo.status === 'IDLE' && (
                    <button 
                      onClick={() => analyzeSingleVideo(selectedVideo)}
                      className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
                    >
                      <Sparkles className="w-3 h-3" />
                      Phân tích video này
                    </button>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden p-4">
                  {selectedVideo.status === 'COMPLETED' && selectedVideo.result ? (
                    <div className="h-full overflow-hidden">
                       <AnalysisResultView result={selectedVideo.result} />
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center space-y-6">
                      {/* Large Preview */}
                      <div className="relative w-full max-w-2xl aspect-video bg-black rounded-xl overflow-hidden shadow-2xl border border-slate-700">
                        <video 
                          src={selectedVideo.previewUrl} 
                          controls 
                          className="w-full h-full object-contain"
                        />
                      </div>

                      <div className="max-w-md text-center">
                        {selectedVideo.status === 'ANALYZING' && (
                          <div className="flex flex-col items-center gap-3">
                            <div className="p-3 bg-blue-500/10 rounded-full">
                              <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                            </div>
                            <h3 className="text-lg font-medium text-blue-200">Đang phân tích chi tiết...</h3>
                            <p className="text-sm text-slate-400">
                              Hệ thống đang tách cảnh và tạo prompt cho video này. Vui lòng đợi trong giây lát.
                            </p>
                          </div>
                        )}

                        {selectedVideo.status === 'ERROR' && (
                          <div className="flex flex-col items-center gap-3 text-red-300">
                            <AlertCircle className="w-8 h-8" />
                            <h3 className="text-lg font-medium">Phân tích thất bại</h3>
                            <p className="text-sm opacity-80">{selectedVideo.error}</p>
                          </div>
                        )}
                        
                        {selectedVideo.status === 'IDLE' && (
                           <p className="text-slate-500 text-sm mt-4">
                             Video đã sẵn sàng. Nhấn nút phân tích để bắt đầu.
                           </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              // Empty State for Right Panel
              <div className="h-full flex flex-col items-center justify-center text-slate-600 p-8 text-center">
                <div className="w-24 h-24 bg-slate-800/50 rounded-full flex items-center justify-center mb-6 border border-slate-700">
                  <Plus className="w-10 h-10 opacity-30" />
                </div>
                <h3 className="text-xl font-medium text-slate-400 mb-2">Chưa chọn Video</h3>
                <p className="text-sm max-w-md mx-auto leading-relaxed opacity-70">
                  Vui lòng tải lên video và chọn từ danh sách bên trái để xem chi tiết hoặc bắt đầu phân tích.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;