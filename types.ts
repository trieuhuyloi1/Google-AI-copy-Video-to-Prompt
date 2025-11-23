export interface AnalysisResult {
  fullText: string;
  prompts: string[];
}

export type AnalysisStatus = 'IDLE' | 'ANALYZING' | 'COMPLETED' | 'ERROR';

export interface VideoSession {
  id: string;
  file: File;
  previewUrl: string;
  base64Data: string;
  mimeType: string;
  status: AnalysisStatus;
  result: AnalysisResult | null;
  error?: string;
}
