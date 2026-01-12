
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateDailyBriefing = async (stats: any) => {
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
};

export const analyzePlatformData = async (data: any) => {
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
};

export const chatWithAssistantStream = async (message: string, onChunk: (text: string) => void) => {
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
};
