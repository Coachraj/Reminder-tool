
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });

export const generateReminderEmail = async (
  taskTitle: string,
  taskDescription: string,
  assigneeEmail: string,
  companyName: string,
  reminderCount: number
): Promise<{ subject: string; content: string }> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are a persistent personal assistant at "${companyName}". 
      Generate a reminder email for the task: "${taskTitle}".
      Task Description: "${taskDescription}".
      Assignee: ${assigneeEmail}.
      This is nudge number ${reminderCount + 1} sent to this user.
      
      Requirements:
      - Address the user professionally.
      - Mention that this reminder is being sent on behalf of ${companyName}.
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
      subject: `Urgent Reminder from ${companyName}: ${taskTitle}`,
      content: `Hello ${assigneeEmail.split('@')[0]},\n\nThis is a persistent reminder from ${companyName} to complete your task: ${taskTitle}. You have received ${reminderCount} previous notifications. Please reply 'finished' once the task is done.`
    };
  }
};
