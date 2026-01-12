
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";

// Vite uses import.meta.env for environment variables
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY || '';

if (!apiKey) {
  console.warn('GEMINI_API_KEY not found. AI features will not work. Please set VITE_GEMINI_API_KEY in .env.local');
}

const ai = new GoogleGenAI({ apiKey });

export const generateDailyBriefing = async (stats: any) => {
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Generate a short, professional shift handover briefing for a hotel manager based on these today's stats: ${JSON.stringify(stats)}. Include:
      1. Key performance highlights
      2. Critical housekeeping or maintenance needs
      3. A focus area for the incoming shift staff.`,
      config: {
        temperature: 0.4,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            briefing: { type: Type.STRING },
            criticalAlerts: { type: Type.ARRAY, items: { type: Type.STRING } },
            shiftFocus: { type: Type.STRING }
          },
          required: ["briefing", "criticalAlerts", "shiftFocus"]
        }
      }
    });

    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error('Error generating daily briefing:', error);
    throw error;
  }
};

export const analyzePlatformData = async (data: any) => {
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Analyze this booking platform performance data and provide 3 key insights: ${JSON.stringify(data)}`,
      config: {
        temperature: 0.7,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            insights: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  priority: { type: Type.STRING }
                },
                required: ["title", "description", "priority"]
              }
            }
          },
          required: ["summary", "insights"]
        }
      }
    });

    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error('Error analyzing platform data:', error);
    throw error;
  }
};

export const chatWithAssistantStream = async (message: string, onChunk: (text: string) => void) => {
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  try {
    const chat = ai.chats.create({
      model: 'gemini-3-flash-preview',
      config: {
        systemInstruction: "You are the Digilist Assistant. You help staff manage rooms, kitchen orders, and guest stays in a high-tech hospitality environment. Keep responses professional, helpful, and concise."
      }
    });

    const responseStream = await chat.sendMessageStream({ message });
    for await (const chunk of responseStream) {
      const c = chunk as GenerateContentResponse;
      onChunk(c.text || "");
    }
  } catch (error) {
    console.error('Error in chat stream:', error);
    throw error;
  }
};
