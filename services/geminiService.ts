
import { GoogleGenAI } from "@google/genai";
import { GameStage, Player } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getDealerCommentary = async (
  stage: GameStage,
  pot: number,
  player: Player,
  lastAction?: string
): Promise<string> => {
  try {
    const prompt = `
      You are a professional, witty, and slightly flamboyant Bollywood-style casino dealer for a Teen Patti game called "Gothahula Teen Patti".
      Current Game Stage: ${stage}
      Total Pot: ${pot} coins
      Player ${player.name} just ${lastAction || 'is waiting'}.
      Player Hand Status: ${player.isSeen ? 'They have seen their cards' : 'They are playing blind'}.
      Player Wallet: ${player.coins} coins.

      Provide a short, 1-2 sentence witty commentary or encouragement in English with a slight Desi flair. 
      Don't mention technical mechanics unless it's to tease the player about their bet.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: "You are the Gothahula Dealer. Be charismatic, slightly spicy, and keep it brief.",
        temperature: 0.8,
      },
    });

    return response.text || "Place your bets, let's see where the luck goes!";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "The cards never lie, but sometimes they surprise!";
  }
};

export const getBotDecision = async (bot: Player, pot: number, boot: number): Promise<{ action: 'chaal' | 'pack' | 'blind', amount: number }> => {
    // Simple heuristic-based bot decision logic
    // Usually, bots in Teen Patti follow basic probability or "luck" simulations
    const rand = Math.random();
    
    // If bot has no cards yet, just blind
    if (bot.hand.length === 0) return { action: 'blind', amount: boot };

    // Simple strategy:
    // If rand < 0.1, pack (fold)
    // If rand < 0.3, play blind
    // Otherwise, see cards and play chaal
    if (rand < 0.15) return { action: 'pack', amount: 0 };
    if (rand < 0.4 && !bot.isSeen) return { action: 'blind', amount: boot };
    
    return { action: 'chaal', amount: boot * 2 };
}
