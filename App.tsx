
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Task, TaskStatus, SimulatedEmail, AppView } from './types';
import { generateReminderEmail } from './services/geminiService';
import { v4 as uuidv4 } from 'uuid';

// Components
const TaskForm: React.FC<{ 
  onAddTask: (task: Omit<Task, 'id' | 'createdAt' | 'lastReminderAt' | 'reminderCount' | 'status'>) => void,
  savedContacts: string[],
  senderEmail: string,
  companyName: string
}> = ({ onAddTask, savedContacts, senderEmail, companyName }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assigneeEmail, setAssigneeEmail] = useState('');
  const [interval, setInterval] = useState(1);
  const [isBatchMode, setIsBatchMode] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (isBatchMode && savedContacts.length > 0) {
      savedContacts.forEach(email => {
        onAddTask({ title, description, assigneeEmail: email, senderEmail, companyName, intervalHours: interval });
      });
    } else {
      if (!assigneeEmail.trim()) return;
      onAddTask({ title, description, assigneeEmail, senderEmail, companyName, intervalHours: interval });
    }

    setTitle('');
    setDescription('');
    setAssigneeEmail('');
    setInterval(1);
    setIsBatchMode(false);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-8 space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <i className="fas fa-paper-plane text-blue-600"></i> Assign Persistent Task
        </h2>
        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-1 rounded">
          From: {companyName || 'Default Co.'}
        </div>
      </div>
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
          <div className="flex justify-between items-center">
            <label className="text-sm font-semibold text-slate-600">Assign To</label>
            {savedContacts.length > 0 && (
              <label className="flex items-center gap-1 text-[10px] font-bold text-blue-600 cursor-pointer uppercase">
                <input 
                  type="checkbox" 
                  checked={isBatchMode} 
                  onChange={(e) => setIsBatchMode(e.target.checked)}
                  className="rounded border-slate-300"
                />
                Batch All Contacts
              </label>
            )}
          </div>
          {isBatchMode ? (
            <div className="w-full p-2 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 text-xs font-bold flex items-center gap-2 h-10">
              <i className="fas fa-users"></i> Assigning to {savedContacts.length} contacts
            </div>
          ) : (
            <div className="relative">
              <input
                type="email"
                list="contacts-list"
                value={assigneeEmail}
                onChange={(e) => setAssigneeEmail(e.target.value)}
                className="w-full p-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                placeholder="colleague@company.com"
                required={!isBatchMode}
              />
              <datalist id="contacts-list">
                {savedContacts.map(email => <option key={email} value={email} />)}
              </datalist>
            </div>
          )}
        </div>
        <div className="space-y-1">
          <label className="text-sm font-semibold text-slate-600">Reminder Interval</label>
          <select
            value={interval}
            onChange={(e) => setInterval(Number(e.target.value))}
            className="w-full p-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white transition"
          >
            <optgroup label="Demo">
              <option value={0.01}>Every 30 Seconds</option>
            </optgroup>
            <optgroup label="Hourly">
              <option value={1}>Every 1 Hour</option>
              <option value={4}>Every 4 Hours</option>
              <option value={10}>Every 10 Hours</option>
            </optgroup>
            <optgroup label="Daily / Weekly">
              <option value={24}>Every 24 Hours (1 Day)</option>
              <option value={48}>Every 2 Days</option>
              <option value={168}>Every 1 Week</option>
            </optgroup>
            <optgroup label="Long Term">
              <option value={720}>Every Month (30 Days)</option>
              <option value={2160}>Every Quarter (90 Days)</option>
              <option value={8760}>Every Year (365 Days)</option>
            </optgroup>
          </select>
        </div>
      </div>
      <div className="space-y-1">
        <label className="text-sm font-semibold text-slate-600">Detailed Description (Reminders repeat until 'Done')</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition min-h-[140px]"
          placeholder="Enter a detailed description. If the task is longer, this area will expand to show all details. Reminders stop automatically when the checkbox is marked."
          rows={5}
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

const TaskCard: React.FC<{ task: Task; onToggleComplete: (id: string) => void }> = ({ task, onToggleComplete }) => {
  const nextReminderIn = task.lastReminderAt 
    ? Math.max(0, (task.lastReminderAt + task.intervalHours * 3600000) - Date.now())
    : 0;

  const days = Math.floor(nextReminderIn / 86400000);
  const hours = Math.floor((nextReminderIn % 86400000) / 3600000);
  const minutes = Math.floor((nextReminderIn % 3600000) / 60000);

  const getIntervalLabel = (h: number) => {
    if (h >= 8760) return `${Math.round(h/8760)}y`;
    if (h >= 720) return `${Math.round(h/720)}mo`;
    if (h >= 168) return `${Math.round(h/168)}w`;
    if (h >= 24) return `${Math.round(h/24)}d`;
    return `${h}h`;
  };

  const isCompleted = task.status === TaskStatus.COMPLETED;

  return (
    <div className={`p-6 rounded-2xl border-2 transition-all duration-500 ${isCompleted ? 'bg-slate-50 border-slate-200' : 'bg-white border-white shadow-xl hover:shadow-2xl'}`}>
      <div className="flex gap-5">
        {/* Completion Checkbox */}
        <div className="pt-1">
          <button 
            onClick={() => onToggleComplete(task.id)}
            title={isCompleted ? "Undo: Mark as Pending" : "Mark as Done"}
            className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-300 shadow-sm ${isCompleted ? 'bg-green-500 border-green-500 text-white' : 'bg-white border-slate-200 text-transparent hover:border-green-400 hover:text-green-400'}`}
          >
            <i className={`fas fa-check text-sm ${isCompleted ? 'scale-100' : 'scale-0'}`}></i>
          </button>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h3 className={`font-black text-xl tracking-tight leading-tight mb-1 transition-all ${isCompleted ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                {task.title}
              </h3>
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-1.5 text-xs font-bold text-blue-600">
                  <i className="fas fa-user-circle"></i>
                  <span>{task.assigneeEmail}</span>
                </div>
                {task.companyName && (
                  <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <i className="fas fa-briefcase"></i>
                    <span>{task.companyName}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className={`mt-4 whitespace-pre-wrap text-sm leading-relaxed min-h-[1.5rem] ${isCompleted ? 'text-slate-400 italic' : 'text-slate-600'}`}>
            {task.description}
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-4">
            <div className="flex gap-4">
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-tighter">Frequency</span>
                <span className="text-xs font-bold text-slate-700">{getIntervalLabel(task.intervalHours)} interval</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-tighter">Delivered</span>
                <span className="text-xs font-bold text-slate-700">{task.reminderCount} nudges</span>
              </div>
            </div>

            {!isCompleted ? (
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-black uppercase text-orange-400 tracking-tighter">Next Delivery</span>
                <span className="text-xs font-black text-orange-600 bg-orange-50 px-2 py-1 rounded-lg">
                  {days > 0 ? `${days}d ` : ''}{hours > 0 ? `${hours}h ` : ''}{minutes}m
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => onToggleComplete(task.id)}
                  className="px-3 py-1 bg-white border border-slate-200 text-[10px] font-black text-slate-500 rounded-lg hover:bg-slate-100 transition uppercase tracking-tighter flex items-center gap-1"
                >
                  <i className="fas fa-undo"></i> Reactivate Task
                </button>
                <span className="text-[10px] font-black uppercase text-green-500 bg-green-50 px-3 py-1 rounded-full border border-green-100">
                  <i className="fas fa-check-double mr-1"></i> Reminders Silenced
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
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
                <div className="flex items-center gap-2 mt-1">
                  <div className="text-[10px] text-slate-400 uppercase tracking-tighter">From: {email.companyName}</div>
                </div>
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
                      <span className="font-bold text-slate-800">{selectedEmail.companyName || 'Persistent Assistant'}</span>
                      <span className="text-slate-400">&lt;{selectedEmail.senderEmail || 'system@remindme.ai'}&gt;</span>
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
  const [savedContacts, setSavedContacts] = useState<string[]>([]);
  const [senderEmail, setSenderEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [currentView, setCurrentView] = useState<AppView>(AppView.TASKS);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [undoToast, setUndoToast] = useState<{ visible: boolean; taskId: string; message: string }>({ visible: false, taskId: '', message: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load from localStorage on init
  useEffect(() => {
    const savedTasks = localStorage.getItem('remindme_tasks');
    const savedEmails = localStorage.getItem('remindme_emails');
    const savedContactsLocal = localStorage.getItem('remindme_contacts');
    const savedSender = localStorage.getItem('remindme_sender_email');
    const savedCompany = localStorage.getItem('remindme_company_name');
    
    if (savedTasks) setTasks(JSON.parse(savedTasks));
    if (savedEmails) setEmails(JSON.parse(savedEmails));
    if (savedContactsLocal) setSavedContacts(JSON.parse(savedContactsLocal));
    if (savedSender) setSenderEmail(savedSender);
    if (savedCompany) setCompanyName(savedCompany);
  }, []);

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem('remindme_tasks', JSON.stringify(tasks));
    localStorage.setItem('remindme_emails', JSON.stringify(emails));
    localStorage.setItem('remindme_contacts', JSON.stringify(savedContacts));
    localStorage.setItem('remindme_sender_email', senderEmail);
    localStorage.setItem('remindme_company_name', companyName);
  }, [tasks, emails, savedContacts, senderEmail, companyName]);

  // Handle Contact File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      const foundEmails = content.match(emailRegex) || [];
      const uniqueEmails = Array.from(new Set([...savedContacts, ...foundEmails]));
      setSavedContacts(uniqueEmails);
      alert(`Imported ${foundEmails.length} emails. Total unique contacts: ${uniqueEmails.length}`);
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const clearContacts = () => {
    if (confirm("Are you sure you want to clear your saved email list?")) {
      setSavedContacts([]);
    }
  };

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

  // Mark Task as Completed / Revert Undo
  const toggleComplete = useCallback((id: string) => {
    setTasks(prev => {
      let taskToUpdate = prev.find(t => t.id === id);
      if (!taskToUpdate) return prev;

      const newStatus = taskToUpdate.status === TaskStatus.PENDING ? TaskStatus.COMPLETED : TaskStatus.PENDING;
      
      // Show undo toast
      const msg = newStatus === TaskStatus.COMPLETED ? 'Task Completed' : 'Task Reactivated';
      setUndoToast({ visible: true, taskId: id, message: msg });
      
      return prev.map(t => t.id === id ? { ...t, status: newStatus } : t);
    });
  }, []);

  // Hide toast after timeout
  useEffect(() => {
    if (undoToast.visible) {
      const timer = setTimeout(() => setUndoToast(prev => ({ ...prev, visible: false })), 4000);
      return () => clearTimeout(timer);
    }
  }, [undoToast.visible]);

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
            task.companyName || "Nudge Systems",
            task.reminderCount
          );
          
          const newEmail: SimulatedEmail = {
            id: uuidv4(),
            taskId: task.id,
            taskTitle: task.title,
            assigneeEmail: task.assigneeEmail,
            senderEmail: task.senderEmail,
            companyName: task.companyName,
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
            new Notification(`Nudge from ${task.companyName || 'Persistent Assistant'}`, {
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

  // Filtering and Sorting Logic
  const filteredTasks = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return tasks;
    return tasks.filter(t => 
      t.title.toLowerCase().includes(query) || 
      t.description.toLowerCase().includes(query) ||
      t.assigneeEmail.toLowerCase().includes(query) ||
      t.companyName.toLowerCase().includes(query)
    );
  }, [tasks, searchQuery]);

  // Pending tasks are sorted by their "Next Delivery" time
  const pendingTasks = useMemo(() => {
    return filteredTasks
      .filter(t => t.status === TaskStatus.PENDING)
      .sort((a, b) => {
        const nextA = (a.lastReminderAt || a.createdAt) + (a.intervalHours * 3600000);
        const nextB = (b.lastReminderAt || b.createdAt) + (b.intervalHours * 3600000);
        return nextA - nextB;
      });
  }, [filteredTasks]);

  const completedTasks = useMemo(() => {
    return filteredTasks
      .filter(t => t.status === TaskStatus.COMPLETED)
      .sort((a, b) => b.createdAt - a.createdAt); // Completed sorted by creation (newest first)
  }, [filteredTasks]);

  return (
    <div className="h-screen flex flex-col md:flex-row bg-slate-50">
      {/* Sidebar Nav */}
      <aside className="w-full md:w-72 bg-slate-900 text-white flex flex-col z-20">
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

        <nav className="flex-1 p-6 space-y-6 overflow-y-auto">
          <div className="space-y-2">
            <button
              onClick={() => setCurrentView(AppView.TASKS)}
              className={`w-full flex items-center justify-between p-4 rounded-xl transition-all duration-300 ${currentView === AppView.TASKS ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'hover:bg-slate-800 text-slate-400'}`}
            >
              <div className="flex items-center gap-4">
                <i className="fas fa-layer-group text-lg"></i>
                <span className="font-bold tracking-tight">Board</span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${currentView === AppView.TASKS ? 'bg-white text-blue-600' : 'bg-slate-800 text-slate-500'}`}>
                {tasks.filter(t => t.status === TaskStatus.PENDING).length}
              </span>
            </button>
            
            <button
              onClick={() => setCurrentView(AppView.INBOX)}
              className={`w-full flex items-center justify-between p-4 rounded-xl transition-all duration-300 ${currentView === AppView.INBOX ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'hover:bg-slate-800 text-slate-400'}`}
            >
              <div className="flex items-center gap-4">
                <i className="fas fa-network-wired text-lg"></i>
                <span className="font-bold tracking-tight">Log</span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${currentView === AppView.INBOX ? 'bg-white text-blue-600' : 'bg-slate-800 text-slate-500'}`}>
                {emails.length}
              </span>
            </button>
          </div>

          <div className="pt-6 border-t border-slate-800">
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 px-2">Sender Settings</h4>
            <div className="space-y-3 px-2">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 font-bold uppercase">Company Name</label>
                <input 
                  type="text" 
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Acme Corp"
                  className="w-full bg-slate-800 border-none rounded-lg p-2 text-xs font-semibold focus:ring-1 focus:ring-blue-500 transition outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 font-bold uppercase">My Email</label>
                <input 
                  type="email" 
                  value={senderEmail}
                  onChange={(e) => setSenderEmail(e.target.value)}
                  placeholder="me@acme.com"
                  className="w-full bg-slate-800 border-none rounded-lg p-2 text-xs font-semibold focus:ring-1 focus:ring-blue-500 transition outline-none"
                />
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-800">
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 px-2">Saved Contacts</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between px-2 text-xs font-bold text-slate-400">
                <span>{savedContacts.length} Contacts</span>
                <button onClick={clearContacts} className="hover:text-red-400 transition text-[10px] uppercase">Clear</button>
              </div>
              <label className="w-full flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 cursor-pointer transition text-xs font-bold text-slate-300">
                <i className="fas fa-file-upload"></i>
                <span>Import List</span>
                <input type="file" className="hidden" accept=".csv,.txt" onChange={handleFileUpload} ref={fileInputRef} />
              </label>
            </div>
          </div>
        </nav>

        <div className="p-6 mt-auto border-t border-slate-800">
          <div className="p-4 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border border-slate-700/50">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-500 uppercase">Compliance Engine</span>
              <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse"></span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Area */}
      <main className="flex-1 overflow-y-auto p-4 md:p-10 relative">
        {/* Undo Toast */}
        {undoToast.visible && (
          <div className="fixed bottom-10 right-10 bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-6 z-50 animate-in slide-in-from-bottom-5 duration-300 border border-slate-700">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
              <span className="font-bold text-sm tracking-tight">{undoToast.message}</span>
            </div>
            <button 
              onClick={() => {
                toggleComplete(undoToast.taskId);
                setUndoToast(prev => ({ ...prev, visible: false }));
              }}
              className="text-xs font-black uppercase text-blue-400 hover:text-blue-300 tracking-widest bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 transition active:scale-95"
            >
              Undo
            </button>
            <button 
              onClick={() => setUndoToast(prev => ({ ...prev, visible: false }))}
              className="text-slate-500 hover:text-white transition"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
        )}

        <div className="max-w-6xl mx-auto pb-20">
          {currentView === AppView.TASKS ? (
            <div className="space-y-10 animate-in fade-in zoom-in-95 duration-500">
              <TaskForm 
                onAddTask={addTask} 
                savedContacts={savedContacts} 
                senderEmail={senderEmail}
                companyName={companyName}
              />

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                    <i className="fas fa-search"></i>
                  </div>
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filter by title, assignee, or detail..." 
                    className="bg-transparent border-none focus:ring-0 text-slate-700 font-medium placeholder-slate-400 w-full md:w-96"
                  />
                </div>
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="text-xs font-bold text-slate-400 hover:text-slate-600 transition uppercase tracking-wider px-3"
                  >
                    Clear Filter
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 gap-10">
                {/* Active Section */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-2 h-8 bg-blue-600 rounded-full"></div>
                    <h2 className="text-xl font-black text-slate-800 tracking-tight uppercase">
                      Active Nudge Queue (Sorted by Next Delivery)
                    </h2>
                    <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-black">
                      {pendingTasks.length}
                    </span>
                  </div>
                  {pendingTasks.length === 0 ? (
                    <div className="p-20 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200 text-slate-400">
                      <i className="fas fa-satellite text-6xl mb-4 opacity-10"></i>
                      <p className="font-black text-lg text-slate-400 uppercase tracking-widest">Quiet Orbit</p>
                      <p className="text-sm mt-1">
                        {searchQuery ? 'Zero results for your query.' : 'No persistent reminders currently active.'}
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-6">
                      {pendingTasks.map(t => <TaskCard key={t.id} task={t} onToggleComplete={toggleComplete} />)}
                    </div>
                  )}
                </div>

                {/* Accomplished Section */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-2 h-8 bg-green-500 rounded-full"></div>
                    <h2 className="text-xl font-black text-slate-500 tracking-tight uppercase">
                      Complied / Terminated
                    </h2>
                    <span className="bg-slate-200 text-slate-500 px-3 py-1 rounded-full text-xs font-black">
                      {completedTasks.length}
                    </span>
                  </div>
                  {completedTasks.length === 0 ? (
                    <div className="p-12 text-center bg-slate-100/50 rounded-3xl border border-slate-200 text-slate-400 grayscale">
                      <p className="text-sm font-bold uppercase tracking-widest">No completed tasks yet</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {completedTasks.map(t => <TaskCard key={t.id} task={t} onToggleComplete={toggleComplete} />)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full animate-in slide-in-from-bottom-10 fade-in duration-500">
              <EmailView emails={emails} onReplyFinished={toggleComplete} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
