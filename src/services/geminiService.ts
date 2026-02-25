import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const generateAchievementQuote = async (achievementName: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate a short, epic one-line quote for unlocking the achievement: "${achievementName}" in a space war game. Keep it under 10 words.`,
    });
    return response.text?.trim() || "Great job, commander!";
  } catch (error) {
    console.error("Error generating quote:", error);
    return "Victory is yours!";
  }
};
