
import { GoogleGenAI, Type } from "@google/genai";
import { TaskItem } from "../types";

export const generateReminderEmail = async (
  taskTitle: string,
  taskDescription: string,
  items: TaskItem[],
  assigneeEmail: string,
  companyName: string,
  reminderCount: number
): Promise<{ subject: string; content: string }> => {
  const ai = new GoogleGenAI({
    apiKey: import.meta.env.VITE_GEMINI_API_KEY
  });

  const pendingItemsText = items.filter(i => !i.completed).map(i => i.text).join('\n- ');
  const completedItemsText = items.filter(i => i.completed).map(i => i.text).join('\n- ');

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are a professional yet persistent automated assistant for "${companyName}". 
      Your goal is to generate a reminder email for the task: "${taskTitle}".
      
      Context: "${taskDescription}".
      Target Recipient: ${assigneeEmail}.
      This is nudge sequence number ${reminderCount + 1}.

      CURRENT CHECKLIST STATUS:
      To-do:
      - ${pendingItemsText || 'Primary objective is pending.'}
      
      Done:
      - ${completedItemsText || 'No steps completed yet.'}

      Guidelines:
      1. Tone should start professional and become increasingly urgent/firm with higher sequence numbers.
      2. Explicitly state that these automated nudges will continue until all checklist items are marked as complete.
      3. Keep the content clear and actionable.
      4. Use professional formatting.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            subject: {
              type: Type.STRING,
              description: "The subject line of the reminder email."
            },
            content: {
              type: Type.STRING,
              description: "The body text of the reminder email."
            }
          },
          required: ["subject", "content"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("Empty response from AI");
    
    return JSON.parse(text);
  } catch (error) {
    console.error("AI Generation failed:", error);
    // Fallback content if API fails or quota is hit
    return {
      subject: `[REMINDER] ACTION REQUIRED: ${taskTitle} (Nudge #${reminderCount + 1})`,
      content: `Hello,\n\nThis is a persistent reminder regarding your task: "${taskTitle}".\n\nOur records show that you still have pending items on your checklist. Please log into the portal to complete them. These notifications will continue periodically until all items are verified.\n\nDescription: ${taskDescription}\n\nBest regards,\nThe ${companyName} Automated Nudge System`
    };
  }
};
