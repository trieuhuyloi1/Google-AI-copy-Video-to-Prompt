import { GoogleGenAI } from "@google/genai";
import { AnalysisResult } from "../types";

// Initialize the client
// API Key must be in process.env.API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SYSTEM_PROMPT = `
Bạn là một chuyên gia phân tích video và kỹ sư tạo prompt cho AI (Prompt Engineer).
Nhiệm vụ của bạn là phân tích video được cung cấp và tạo ra các prompt chi tiết để tái tạo lại video đó bằng các công cụ AI tạo video (như Veo, Sora, Runway).

HÃY THỰC HIỆN ĐÚNG CẤU TRÚC SAU:

1. **Phân tích chi tiết (Tiếng Việt):**
   - Hãy trình bày rõ ràng từng phân cảnh. BẮT BUỘC bắt đầu mỗi phân cảnh bằng tiêu đề định dạng: "**Cảnh [số thứ tự] (Thời gian ước lượng):**"
   - **Góc quay & Camera:** Phân tích chi tiết góc máy (Low/High angle, Wide/Close-up, POV...) và chuyển động camera (Pan, Tilt, Dolly, Zoom, Tracking...).
   - **Bối cảnh & Ánh sáng:** Mô tả không gian, thời gian, nguồn sáng, nhiệt độ màu.
   - **Nhân vật, Trang phục & Tư thế:**
     + Đặc điểm hình dáng, giới tính, độ tuổi.
     + **MÀU SẮC TRANG PHỤC:** Mô tả chi tiết (quần áo, giày dép, phụ kiện).
     + **DÁNG ĐỨNG & TƯ THẾ (QUAN TRỌNG):** Phân tích kỹ tư thế của đối tượng (đứng, nằm, ngồi, quỳ, bò...) và phương thức di chuyển (đi bằng 2 chân, đi bằng 4 chân, trườn, bay...).
   - **Âm thanh (Audio):** Mô tả âm thanh môi trường, tiếng động (SFX), nhạc nền (mood), và ghi lại lời thoại/thuyết minh (nếu có).

2. **Tạo Prompt (Tiếng Anh):**
   - Dựa trên toàn bộ phân tích, hãy viết **DUY NHẤT 1 PROMPT** (Single Continuous Prompt) mô tả toàn bộ diễn biến video để tái tạo lại trọn vẹn.
   - Prompt cần kết hợp các cảnh lại thành một dòng chảy kể chuyện mượt mà (narrative flow).
   - **BẮT BUỘC bao gồm:** 
     + Chi tiết Camera angles & movement (e.g., "camera pans left", "drone shot").
     + Chi tiết Màu sắc trang phục cụ thể (e.g., "wearing a crimson red jacket", "neon blue sneakers").
     + **Chi tiết Dáng đứng & Tư thế (Posture & Stance):** (e.g., "kneeling on the ground", "walking on four legs", "lying prone", "standing upright").
     + Mô tả Âm thanh/Audio atmosphere (e.g., "ambient sound of rain", "soft piano music").
   - Phong cách (Style): Photorealistic, Cinematic, 8k, High detail.
   - KHÔNG xuống dòng trong nội dung prompt.
   - KHÔNG đánh số thứ tự (1., 2.) hay chia tách Scene trong phần prompt này.

3. **Dữ liệu xuất (Quan trọng):**
   - Ở cuối câu trả lời, bạn BẮT BUỘC phải đặt prompt tiếng Anh DUY NHẤT đó nằm giữa hai thẻ đánh dấu sau để hệ thống tự động trích xuất.
   - Prompt phải nằm trên MỘT DÒNG DUY NHẤT.
   
   --- PROMPTS_EXPORT_START ---
   [Nội dung prompt duy nhất cho video]
   --- PROMPTS_EXPORT_END ---
`;

export const analyzeVideoContent = async (
  base64Data: string, 
  mimeType: string,
  userInstruction?: string
): Promise<AnalysisResult> => {
  try {
    const modelId = 'gemini-2.5-flash'; // Using Flash for multimodal speed and context

    // Prepare the parts
    const videoPart = {
      inlineData: {
        data: base64Data,
        mimeType: mimeType,
      },
    };

    const promptText = userInstruction 
      ? `${SYSTEM_PROMPT}\n\nLưu ý bổ sung từ người dùng: ${userInstruction}`
      : SYSTEM_PROMPT;

    const response = await ai.models.generateContent({
      model: modelId,
      contents: {
        parts: [videoPart, { text: promptText }]
      },
      config: {
        temperature: 0.4, // Lower temperature for more analytical/precise output
        maxOutputTokens: 8192, // Increased to support many prompts/scenes
      }
    });

    const text = response.text || "Không có phản hồi từ AI.";

    // Extract prompts specifically based on the markers
    const prompts: string[] = [];
    const promptRegex = /--- PROMPTS_EXPORT_START ---([\s\S]*?)--- PROMPTS_EXPORT_END ---/;
    const match = text.match(promptRegex);

    if (match && match[1]) {
      // Get the content, remove newlines to ensure it is one single line if the AI accidentally added breaks
      const cleanLine = match[1].replace(/\n/g, ' ').trim();
      if (cleanLine) prompts.push(cleanLine);
    }

    return {
      fullText: text,
      prompts: prompts
    };

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw new Error(error instanceof Error ? error.message : "Unknown error occurred during analysis");
  }
};