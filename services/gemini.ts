import { GoogleGenAI } from "@google/genai";
import { ChatMessage } from "../types";

const apiKey = process.env.API_KEY || '';

// Initialize client
const ai = new GoogleGenAI({ apiKey });

export const sendMessageToGemini = async (
  message: string,
  history: ChatMessage[]
): Promise<string> => {
  try {
    const model = 'gemini-3-pro-preview';
    
    // Convert history to compatible format if needed, 
    // but for simplicity in this demo we'll just send the new message 
    // or start a fresh chat context if complex history management is needed.
    // Ideally, we maintain a persistent chat session instance.
    
    const chat = ai.chats.create({
      model: model,
      config: {
        systemInstruction: "You are a helpful AI assistant embedded in a 3D interactive particle visualization app. The user can control particles with hand gestures. Be concise and friendly.",
      },
      history: history.map(h => ({
        role: h.role,
        parts: [{ text: h.text }]
      }))
    });

    const result = await chat.sendMessage({ message });
    return result.text || "I couldn't generate a response.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Sorry, I encountered an error communicating with the AI.";
  }
};
