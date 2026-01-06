
export enum TaskStatus {
  PENDING = 'pending',
  COMPLETED = 'completed'
}

export interface Task {
  id: string;
  title: string;
  description: string;
  assigneeEmail: string;
  senderEmail: string;
  companyName: string;
  intervalHours: number;
  status: TaskStatus;
  createdAt: number;
  lastReminderAt: number | null;
  reminderCount: number;
}

export interface SimulatedEmail {
  id: string;
  taskId: string;
  taskTitle: string;
  assigneeEmail: string;
  senderEmail: string;
  companyName: string;
  subject: string;
  content: string;
  sentAt: number;
  isRead: boolean;
}

export enum AppView {
  TASKS = 'tasks',
  INBOX = 'inbox'
}
