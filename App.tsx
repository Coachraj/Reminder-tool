
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Task, TaskStatus, SimulatedEmail, AppView } from './types';
import { generateReminderEmail } from './services/geminiService';
import { v4 as uuidv4 } from 'uuid';

// Components
const TaskForm: React.FC<{ onAddTask: (task: Omit<Task, 'id' | 'createdAt' | 'lastReminderAt' | 'reminderCount' | 'status'>) => void }> = ({ onAddTask }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assigneeEmail, setAssigneeEmail] = useState('');
  const [interval, setInterval] = useState(1);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !assigneeEmail.trim()) return;
    onAddTask({ title, description, assigneeEmail, intervalHours: interval });
    setTitle('');
    setDescription('');
    setAssigneeEmail('');
    setInterval(1);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-8 space-y-4">
      <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
        <i className="fas fa-paper-plane text-blue-600"></i> Assign Persistent Task
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-1">
          <label className="text-sm font-semibold text-slate-600">Task Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full p-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
            placeholder="e.g., Q3 Report"
            required
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-semibold text-slate-600">Assign To (Email)</label>
          <input
            type="email"
            value={assigneeEmail}
            onChange={(e) => setAssigneeEmail(e.target.value)}
            className="w-full p-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
            placeholder="colleague@company.com"
            required
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-semibold text-slate-600">Reminder Interval</label>
          <select
            value={interval}
            onChange={(e) => setInterval(Number(e.target.value))}
            className="w-full p-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white transition"
          >
            <optgroup label="Fast (Demo)">
              <option value={0.01}>Every 30 Seconds</option>
            </optgroup>
            <optgroup label="Hourly">
              <option value={1}>Every 1 Hour</option>
              <option value={2}>Every 2 Hours</option>
              <option value={4}>Every 4 Hours</option>
              <option value={6}>Every 6 Hours</option>
              <option value={8}>Every 8 Hours</option>
              <option value={10}>Every 10 Hours</option>
            </optgroup>
            <optgroup label="Daily">
              <option value={24}>Every 24 Hours (1 Day)</option>
              <option value={48}>Every 48 Hours (2 Days)</option>
            </optgroup>
          </select>
        </div>
      </div>
      <div className="space-y-1">
        <label className="text-sm font-semibold text-slate-600">Detailed Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full p-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
          placeholder="Detailed instructions for the assignee..."
          rows={2}
        />
      </div>
      <button
        type="submit"
        className="w-full py-3 bg-slate-900 hover:bg-black text-white font-bold rounded-lg transition transform active:scale-95 flex items-center justify-center gap-2 shadow-lg"
      >
        <i className="fas fa-bullhorn"></i> Start Task Persistence
      </button>
    </form>
  );
};

const TaskCard: React.FC<{ task: Task; onComplete: (id: string) => void }> = ({ task, onComplete }) => {
  const nextReminderIn = task.lastReminderAt 
    ? Math.max(0, (task.lastReminderAt + task.intervalHours * 3600000) - Date.now())
    : 0;

  const hours = Math.floor(nextReminderIn / 3600000);
  const minutes = Math.floor((nextReminderIn % 3600000) / 60000);

  return (
    <div className={`p-5 rounded-xl border-l-4 ${task.status === TaskStatus.COMPLETED ? 'bg-slate-50 border-slate-200' : 'bg-white border-l-blue-600 shadow-md'} transition-all duration-300`}>
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1 min-w-0">
          <h3 className={`font-bold text-lg truncate ${task.status === TaskStatus.COMPLETED ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
            {task.title}
          </h3>
          <div className="flex items-center gap-2 text-xs font-bold text-blue-600 mb-1">
            <i className="fas fa-user"></i>
            <span>{task.assigneeEmail}</span>
          </div>
          <p className="text-sm text-slate-500 line-clamp-2">{task.description}</p>
        </div>
        <span className={`ml-2 px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider ${task.status === TaskStatus.COMPLETED ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
          {task.status}
        </span>
      </div>
      
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 border-t border-slate-100 pt-3">
        <div className="flex gap-4">
          <span className="flex items-center gap-1">
            <i className="fas fa-redo"></i> {task.intervalHours >= 24 ? `${task.intervalHours/24}d` : `${task.intervalHours}h`}
          </span>
          <span className="flex items-center gap-1">
            <i className="fas fa-envelope-open-text"></i> {task.reminderCount} sent
          </span>
        </div>
        {task.status === TaskStatus.PENDING && (
          <span className="text-orange-600 font-bold bg-orange-50 px-2 py-0.5 rounded-full">
            Next: {hours > 0 ? `${hours}h ` : ''}{minutes}m
          </span>
        )}
      </div>

      {task.status === TaskStatus.PENDING && (
        <button
          onClick={() => onComplete(task.id)}
          className="mt-4 w-full py-2 bg-slate-100 hover:bg-green-100 hover:text-green-700 text-slate-700 font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <i className="fas fa-check"></i> Terminate Reminders
        </button>
      )}
    </div>
  );
};

const EmailView: React.FC<{ emails: SimulatedEmail[]; onReplyFinished: (taskId: string) => void }> = ({ emails, onReplyFinished }) => {
  const [selectedEmail, setSelectedEmail] = useState<SimulatedEmail | null>(null);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-[calc(100vh-14rem)]">
      <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 rounded-t-xl">
        <h2 className="font-bold text-slate-700 flex items-center gap-2">
          <i className="fas fa-mail-bulk text-blue-500"></i> Network Activity Log
        </h2>
        <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Live Monitoring</span>
      </div>
      
      <div className="flex-1 overflow-hidden flex">
        {/* Sidebar */}
        <div className="w-1/3 border-r border-slate-100 overflow-y-auto bg-white">
          {emails.length === 0 ? (
            <div className="p-10 text-center text-slate-400">
              <i className="fas fa-satellite-dish text-4xl mb-2 animate-pulse"></i>
              <p className="text-sm">No outgoing traffic detected.</p>
            </div>
          ) : (
            emails.map(email => (
              <div
                key={email.id}
                onClick={() => setSelectedEmail(email)}
                className={`p-4 border-b border-slate-50 cursor-pointer hover:bg-slate-50 transition ${selectedEmail?.id === email.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''}`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-xs text-blue-600 truncate pr-2">{email.assigneeEmail}</span>
                  <span className="text-[10px] text-slate-400">{new Date(email.sentAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                </div>
                <div className="text-xs text-slate-800 font-bold truncate">{email.subject}</div>
                <div className="text-[10px] text-slate-400 mt-1 uppercase tracking-tighter">Ref: {email.taskTitle}</div>
              </div>
            ))
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 bg-slate-50/20">
          {selectedEmail ? (
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="border-b border-slate-200 pb-6">
                <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-tight">{selectedEmail.subject}</h1>
                <div className="flex items-center gap-3 mt-4">
                  <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-white shadow-lg">
                    <i className="fas fa-robot"></i>
                  </div>
                  <div className="text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800">Persistent Assistant</span>
                      <span className="text-slate-400">&lt;system@remindme.ai&gt;</span>
                    </div>
                    <div className="text-slate-500">
                      To: <span className="font-semibold text-blue-600">{selectedEmail.assigneeEmail}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm min-h-[300px] prose prose-slate max-w-none">
                <p className="whitespace-pre-wrap leading-relaxed text-slate-700">
                  {selectedEmail.content}
                </p>
              </div>
              <div className="flex flex-wrap gap-4 pt-4">
                <button 
                  onClick={() => {
                    onReplyFinished(selectedEmail.taskId);
                    setSelectedEmail(null);
                  }}
                  className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-bold text-sm transition shadow-lg flex items-center gap-2 transform hover:-translate-y-0.5"
                >
                  <i className="fas fa-check-double"></i> Reply: "finished"
                </button>
                <button className="px-8 py-3 bg-white border-2 border-slate-200 hover:border-slate-400 rounded-full font-bold text-sm transition text-slate-600">
                  <i className="fas fa-undo"></i> Request Status
                </button>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-300 flex-col italic">
              <div className="relative mb-6">
                <i className="fas fa-envelope text-7xl opacity-10"></i>
                <i className="fas fa-search absolute bottom-0 right-0 text-3xl opacity-20"></i>
              </div>
              <p className="font-medium">Inspect an outgoing communication to view content</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [emails, setEmails] = useState<SimulatedEmail[]>([]);
  const [currentView, setCurrentView] = useState<AppView>(AppView.TASKS);
  const [isProcessing, setIsProcessing] = useState(false);

  // Load from localStorage on init
  useEffect(() => {
    const savedTasks = localStorage.getItem('remindme_tasks');
    const savedEmails = localStorage.getItem('remindme_emails');
    if (savedTasks) setTasks(JSON.parse(savedTasks));
    if (savedEmails) setEmails(JSON.parse(savedEmails));
  }, []);

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem('remindme_tasks', JSON.stringify(tasks));
    localStorage.setItem('remindme_emails', JSON.stringify(emails));
  }, [tasks, emails]);

  // Add Task
  const addTask = (taskData: Omit<Task, 'id' | 'createdAt' | 'lastReminderAt' | 'reminderCount' | 'status'>) => {
    const newTask: Task = {
      ...taskData,
      id: uuidv4(),
      createdAt: Date.now(),
      lastReminderAt: null,
      reminderCount: 0,
      status: TaskStatus.PENDING,
    };
    setTasks(prev => [newTask, ...prev]);
  };

  // Mark Task as Completed
  const completeTask = useCallback((id: string) => {
    setTasks(prev => prev.map(t => 
      t.id === id ? { ...t, status: TaskStatus.COMPLETED } : t
    ));
  }, []);

  // Check for due reminders
  useEffect(() => {
    const checkReminders = async () => {
      const now = Date.now();
      if (isProcessing) return;
      
      const tasksToRemind = tasks.filter(task => {
        if (task.status !== TaskStatus.PENDING) return false;
        
        const intervalMs = task.intervalHours * 3600000;
        if (!task.lastReminderAt) return true; 
        return (now - task.lastReminderAt) >= intervalMs;
      });

      if (tasksToRemind.length > 0) {
        setIsProcessing(true);
        
        for (const task of tasksToRemind) {
          const reminder = await generateReminderEmail(
            task.title, 
            task.description, 
            task.assigneeEmail,
            task.reminderCount
          );
          
          const newEmail: SimulatedEmail = {
            id: uuidv4(),
            taskId: task.id,
            taskTitle: task.title,
            assigneeEmail: task.assigneeEmail,
            subject: reminder.subject,
            content: reminder.content,
            sentAt: Date.now(),
            isRead: false
          };

          setEmails(prev => [newEmail, ...prev]);
          setTasks(prev => prev.map(t => 
            t.id === task.id ? { ...t, lastReminderAt: Date.now(), reminderCount: t.reminderCount + 1 } : t
          ));

          // Browser notification
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification(`Nudge sent to ${task.assigneeEmail}`, {
              body: `Task: ${task.title}\nSubject: ${reminder.subject}`,
              icon: 'https://cdn-icons-png.flaticon.com/512/565/565422.png'
            });
          }
        }
        
        setIsProcessing(false);
      }
    };

    const interval = setInterval(checkReminders, 5000); 
    return () => clearInterval(interval);
  }, [tasks, isProcessing]);

  // Request Notification permission
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  const pendingTasks = tasks.filter(t => t.status === TaskStatus.PENDING);
  const completedTasks = tasks.filter(t => t.status === TaskStatus.COMPLETED);

  return (
    <div className="h-screen flex flex-col md:flex-row bg-slate-50">
      {/* Sidebar Nav */}
      <aside className="w-full md:w-72 bg-slate-900 text-white flex flex-col">
        <div className="p-8 border-b border-slate-800">
          <div className="flex items-center gap-4 mb-3">
            <div className="bg-gradient-to-br from-blue-500 to-indigo-700 w-12 h-12 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-900/40 transform rotate-3">
              <i className="fas fa-shield-alt text-2xl"></i>
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight leading-none">Nudge.ai</h1>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-1">Compliance Engine</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-6 space-y-3">
          <button
            onClick={() => setCurrentView(AppView.TASKS)}
            className={`w-full flex items-center justify-between p-4 rounded-xl transition-all duration-300 ${currentView === AppView.TASKS ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'hover:bg-slate-800 text-slate-400'}`}
          >
            <div className="flex items-center gap-4">
              <i className="fas fa-layer-group text-lg"></i>
              <span className="font-bold tracking-tight">Persistence Board</span>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${currentView === AppView.TASKS ? 'bg-white text-blue-600' : 'bg-slate-800 text-slate-500'}`}>
              {pendingTasks.length}
            </span>
          </button>
          
          <button
            onClick={() => setCurrentView(AppView.INBOX)}
            className={`w-full flex items-center justify-between p-4 rounded-xl transition-all duration-300 ${currentView === AppView.INBOX ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'hover:bg-slate-800 text-slate-400'}`}
          >
            <div className="flex items-center gap-4">
              <i className="fas fa-network-wired text-lg"></i>
              <span className="font-bold tracking-tight">Outgoing Traffic</span>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${currentView === AppView.INBOX ? 'bg-white text-blue-600' : 'bg-slate-800 text-slate-500'}`}>
              {emails.length}
            </span>
          </button>
        </nav>

        <div className="p-6">
          <div className="p-5 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border border-slate-700/50">
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">System Health</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">Auto-Nudge</span>
                <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">Gemini-3 Flash</span>
                <span className="text-[10px] text-blue-400 font-black">ACTIVE</span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Area */}
      <main className="flex-1 overflow-y-auto p-4 md:p-10">
        <div className="max-w-6xl mx-auto">
          {currentView === AppView.TASKS ? (
            <div className="space-y-10 animate-in fade-in zoom-in-95 duration-500">
              <TaskForm onAddTask={addTask} />

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                {/* Active Column */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-2 h-8 bg-blue-600 rounded-full"></div>
                    <h2 className="text-xl font-black text-slate-800 tracking-tight">
                      Active Monitoring
                    </h2>
                    <span className="bg-slate-200 text-slate-600 px-3 py-1 rounded-full text-xs font-black">
                      {pendingTasks.length}
                    </span>
                  </div>
                  {pendingTasks.length === 0 ? (
                    <div className="p-16 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200 text-slate-400">
                      <i className="fas fa-tasks text-5xl mb-4 opacity-10"></i>
                      <p className="font-bold text-slate-400">System idle. No tasks in orbit.</p>
                      <p className="text-sm mt-1">Assign a task to start persistent nudging.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4">
                      {pendingTasks.map(t => <TaskCard key={t.id} task={t} onComplete={completeTask} />)}
                    </div>
                  )}
                </div>

                {/* Accomplished Column */}
                <div className="space-y-6 opacity-60">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-2 h-8 bg-green-500 rounded-full"></div>
                    <h2 className="text-xl font-black text-slate-600 tracking-tight">
                      Complied Tasks
                    </h2>
                    <span className="bg-slate-200 text-slate-500 px-3 py-1 rounded-full text-xs font-black">
                      {completedTasks.length}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    {completedTasks.map(t => <TaskCard key={t.id} task={t} onComplete={completeTask} />)}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full animate-in slide-in-from-bottom-10 fade-in duration-500">
              <EmailView emails={emails} onReplyFinished={completeTask} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
