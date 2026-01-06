
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });

export const generateReminderEmail = async (
  taskTitle: string,
  taskDescription: string,
  assigneeEmail: string,
  reminderCount: number
): Promise<{ subject: string; content: string }> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are a persistent personal assistant managing team tasks. 
      Generate a reminder email for the task: "${taskTitle}".
      Task Description: "${taskDescription}".
      Assignee: ${assigneeEmail}.
      This is nudge number ${reminderCount + 1} sent to this user.
      
      Requirements:
      - Address the user formally by their email prefix if possible.
      - The tone should start professional and become increasingly firm and urgent as the reminder count increases.
      - Keep the email concise and focused on the deadline.
      - Return the result in JSON format with "subject" and "content" fields.
      - Explicitly state: "Reply to this email with 'finished' to stop these persistent reminders."`,
      config: {
        responseMimeType: "application/json"
      }
    });

    const result = JSON.parse(response.text || '{"subject": "Reminder", "content": "Just a friendly reminder to complete your task."}');
    return result;
  } catch (error) {
    console.error("Error generating reminder:", error);
    return {
      subject: `Urgent Reminder: ${taskTitle}`,
      content: `Hello ${assigneeEmail.split('@')[0]},\n\nThis is a persistent reminder to complete your task: ${taskTitle}. You have received ${reminderCount} previous notifications. Please reply 'finished' once the task is done.`
    };
  }
};
