
import { GoogleGenAI } from "@google/genai";
import { TaskItem } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });

export const generateReminderEmail = async (
  taskTitle: string,
  taskDescription: string,
  items: TaskItem[],
  assigneeEmail: string,
  companyName: string,
  reminderCount: number
): Promise<{ subject: string; content: string }> => {
  const pendingItems = items.filter(i => !i.completed).map(i => i.text).join('\n- ');
  const completedItems = items.filter(i => i.completed).map(i => i.text).join('\n- ');

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are a persistent personal assistant at "${companyName}". 
      Generate a reminder email for the task: "${taskTitle}".
      
      Main Context: "${taskDescription}".
      Assignee: ${assigneeEmail}.
      This is nudge number ${reminderCount + 1}.

      TASK CHECKLIST STATUS:
      Pending actions:
      - ${pendingItems || 'The main task is not yet marked as finished.'}
      
      Completed actions:
      - ${completedItems || 'No items completed yet.'}

      Requirements:
      - Address the user professionally but firmly.
      - Mention that reminders will PERSIST until all items are checked off in the portal.
      - The tone should escalate in urgency based on nudge count (${reminderCount + 1}).
      - Keep it concise.
      - Return the result in JSON format with "subject" and "content" fields.`,
      config: {
        responseMimeType: "application/json"
      }
    });

    return JSON.parse(response.text || '{"subject": "Reminder", "content": "Just a friendly reminder to complete your task items."}');
  } catch (error) {
    console.error("Error generating reminder:", error);
    return {
      subject: `[ACTION REQUIRED] ${taskTitle} - Nudge #${reminderCount + 1}`,
      content: `Hello,\n\nThis is a persistent reminder from ${companyName} regarding: ${taskTitle}.\n\nYou still have pending items to complete. Reminders will continue until the checklist is finished.\n\nDescription: ${taskDescription}`
    };
  }
};
