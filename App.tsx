
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Task, TaskStatus, TaskItem, SimulatedEmail, AppView } from './types';
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

    // Split description into lines to create items
    const lines = description.split('\n').filter(l => l.trim().length > 0);
    const items: TaskItem[] = lines.length > 0 
      ? lines.map(text => ({ id: uuidv4(), text: text.replace(/^[-*]\s*/, '').trim(), completed: false }))
      : [{ id: uuidv4(), text: 'Complete the main task', completed: false }];

    if (isBatchMode && savedContacts.length > 0) {
      savedContacts.forEach(email => {
        onAddTask({ title, description, items, assigneeEmail: email, senderEmail, companyName, intervalHours: interval });
      });
    } else {
      if (!assigneeEmail.trim()) return;
      onAddTask({ title, description, items, assigneeEmail, senderEmail, companyName, intervalHours: interval });
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
          <i className="fas fa-tasks text-blue-600"></i> New Persistent Directive
        </h2>
        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-1 rounded">
          Issued by: {companyName || 'Nudge System'}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-1">
          <label className="text-sm font-semibold text-slate-600">Short Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full p-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none transition"
            placeholder="e.g., Security Audit"
            required
          />
        </div>
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <label className="text-sm font-semibold text-slate-600">Receiver</label>
            {savedContacts.length > 0 && (
              <label className="flex items-center gap-1 text-[10px] font-bold text-blue-600 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={isBatchMode} 
                  onChange={(e) => setIsBatchMode(e.target.checked)}
                  className="rounded border-slate-300"
                />
                Batch All
              </label>
            )}
          </div>
          {isBatchMode ? (
            <div className="w-full p-2 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 text-xs font-bold flex items-center h-10">
              Broadcasting to {savedContacts.length} recipients
            </div>
          ) : (
            <div className="relative">
              <input
                type="email"
                list="contacts-list"
                value={assigneeEmail}
                onChange={(e) => setAssigneeEmail(e.target.value)}
                className="w-full p-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none transition"
                placeholder="target@org.com"
                required={!isBatchMode}
              />
              <datalist id="contacts-list">
                {savedContacts.map(email => <option key={email} value={email} />)}
              </datalist>
            </div>
          )}
        </div>
        <div className="space-y-1">
          <label className="text-sm font-semibold text-slate-600">Nudge Frequency</label>
          <select
            value={interval}
            onChange={(e) => setInterval(Number(e.target.value))}
            className="w-full p-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none bg-white transition"
          >
            <optgroup label="Rapid">
              <option value={0.01}>Every 30 Seconds (Demo)</option>
              <option value={1}>Every Hour</option>
              <option value={4}>Every 4 Hours</option>
            </optgroup>
            <optgroup label="Standard">
              <option value={24}>Daily (24h)</option>
              <option value={168}>Weekly (7d)</option>
            </optgroup>
            <optgroup label="Long Term">
              <option value={720}>Monthly (30d)</option>
              <option value={2160}>Quarterly (90d)</option>
              <option value={8760}>Yearly (365d)</option>
            </optgroup>
          </select>
        </div>
      </div>
      <div className="space-y-1">
        <label className="text-sm font-semibold text-slate-600">Directive Checklist (Each line = 1 Checkbox)</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none transition min-h-[140px] font-mono text-sm"
          placeholder="Step 1: Open account&#10;Step 2: Transfer funds&#10;Step 3: Close portal"
          rows={5}
        />
      </div>
      <button
        type="submit"
        className="w-full py-4 bg-slate-900 hover:bg-black text-white font-black rounded-xl transition transform active:scale-[0.98] flex items-center justify-center gap-3 shadow-xl"
      >
        <i className="fas fa-bullhorn animate-pulse"></i> INITIATE PERSISTENT NUDGING
      </button>
    </form>
  );
};

const TaskCard: React.FC<{ 
  task: Task; 
  onToggleComplete: (id: string) => void;
  onToggleItem: (taskId: string, itemId: string) => void;
}> = ({ task, onToggleComplete, onToggleItem }) => {
  const nextReminderIn = task.lastReminderAt 
    ? Math.max(0, (task.lastReminderAt + task.intervalHours * 3600000) - Date.now())
    : 0;

  const hours = Math.floor(nextReminderIn / 3600000);
  const minutes = Math.floor((nextReminderIn % 3600000) / 60000);
  const isCompleted = task.status === TaskStatus.COMPLETED;
  const progress = Math.round((task.items.filter(i => i.completed).length / task.items.length) * 100);

  const getFreqLabel = (h: number) => {
    if (h >= 8760) return "Yearly";
    if (h >= 2160) return "Quarterly";
    if (h >= 720) return "Monthly";
    if (h >= 168) return "Weekly";
    if (h >= 24) return "Daily";
    if (h === 1) return "Hourly";
    return `${h}h`;
  };

  return (
    <div className={`p-6 rounded-2xl border-2 transition-all duration-500 relative overflow-hidden ${isCompleted ? 'bg-slate-50 border-slate-200' : 'bg-white border-white shadow-xl'}`}>
      {!isCompleted && (
        <div className="absolute top-0 left-0 h-1 bg-blue-500 transition-all duration-500" style={{ width: `${progress}%` }}></div>
      )}
      
      <div className="flex gap-4">
        <div className="pt-1">
          <button 
            onClick={() => onToggleComplete(task.id)}
            className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center transition-all duration-300 ${isCompleted ? 'bg-green-500 border-green-500 text-white' : 'bg-white border-slate-100 text-transparent hover:border-green-300 hover:text-green-300'}`}
          >
            <i className={`fas fa-check-double ${isCompleted ? 'scale-110' : 'scale-50'}`}></i>
          </button>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start">
            <div>
              <h3 className={`font-black text-xl leading-none mb-2 ${isCompleted ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{task.title}</h3>
              <div className="text-xs font-bold text-blue-600 flex items-center gap-2 mb-4">
                <i className="fas fa-at"></i> {task.assigneeEmail}
              </div>
            </div>
            {isCompleted ? (
              <span className="bg-green-100 text-green-700 text-[10px] font-black px-2 py-1 rounded uppercase tracking-widest">Silenced</span>
            ) : (
              <span className="bg-blue-100 text-blue-700 text-[10px] font-black px-2 py-1 rounded uppercase tracking-widest">Active</span>
            )}
          </div>
          
          <div className="space-y-2 mb-6">
            {task.items.map(item => (
              <div key={item.id} className="flex items-start gap-3 group">
                <input 
                  type="checkbox" 
                  checked={item.completed}
                  onChange={() => onToggleItem(task.id, item.id)}
                  className="mt-1 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <span className={`text-sm ${item.completed ? 'text-slate-400 line-through' : 'text-slate-700 font-medium'}`}>{item.text}</span>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center text-[11px] font-bold text-slate-400 border-t pt-4">
            <div className="flex gap-4">
              <span><i className="fas fa-history mr-1"></i> {task.reminderCount} Sent</span>
              <span><i className="fas fa-clock mr-1"></i> {getFreqLabel(task.intervalHours)}</span>
            </div>
            {!isCompleted && (
              <span className="text-orange-500">
                Next Nudge: {hours}h {minutes}m
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const EmailView: React.FC<{ 
  emails: SimulatedEmail[]; 
  tasks: Task[];
  onToggleItem: (taskId: string, itemId: string) => void;
  onReplyFinished: (taskId: string) => void;
}> = ({ emails, tasks, onToggleItem, onReplyFinished }) => {
  const [selectedEmail, setSelectedEmail] = useState<SimulatedEmail | null>(null);
  
  const currentTask = useMemo(() => 
    tasks.find(t => t.id === selectedEmail?.taskId), 
    [tasks, selectedEmail]
  );

  return (
    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col h-[calc(100vh-12rem)] overflow-hidden">
      <div className="p-4 bg-slate-50 border-b flex justify-between items-center">
        <h2 className="font-black text-slate-800 uppercase tracking-widest text-sm flex items-center gap-2">
          <i className="fas fa-inbox text-blue-500"></i> Receiver Portal
        </h2>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          <span className="text-[10px] font-bold text-slate-400 uppercase">Live Feed</span>
        </div>
      </div>
      
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-1/3 border-r overflow-y-auto">
          {emails.length === 0 ? (
            <div className="p-10 text-center text-slate-300 italic">No incoming nudges.</div>
          ) : (
            emails.map(email => (
              <div
                key={email.id}
                onClick={() => setSelectedEmail(email)}
                className={`p-4 border-b cursor-pointer transition ${selectedEmail?.id === email.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : 'hover:bg-slate-50'}`}
              >
                <div className="flex justify-between mb-1">
                  <span className="text-[10px] font-black text-blue-600 uppercase">{email.companyName}</span>
                  <span className="text-[10px] text-slate-400">{new Date(email.sentAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                </div>
                <div className="text-sm font-bold truncate text-slate-800">{email.subject}</div>
                <div className="text-xs text-slate-500 truncate mt-1">To: {email.assigneeEmail}</div>
              </div>
            ))
          )}
        </div>

        {/* Content */}
        <div className="flex-1 bg-white p-8 overflow-y-auto">
          {selectedEmail ? (
            <div className="max-w-2xl mx-auto">
              <div className="mb-8 pb-6 border-b">
                <h1 className="text-3xl font-black text-slate-900 leading-tight mb-4">{selectedEmail.subject}</h1>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-white font-black">
                    {selectedEmail.companyName[0]}
                  </div>
                  <div className="text-xs">
                    <div className="font-bold text-slate-800">{selectedEmail.companyName} Assistant</div>
                    <div className="text-slate-400">{selectedEmail.senderEmail}</div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100 shadow-inner mb-8">
                <p className="whitespace-pre-wrap text-slate-700 leading-relaxed text-base">
                  {selectedEmail.content}
                </p>
              </div>

              {currentTask && (
                <div className="bg-white border-2 border-blue-500/10 p-6 rounded-3xl shadow-lg mb-8">
                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <i className="fas fa-check-square text-blue-500"></i> Interactive Checklist
                  </h4>
                  <div className="space-y-3">
                    {currentTask.items.map(item => (
                      <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition border border-transparent hover:border-slate-100 group">
                        <input 
                          type="checkbox" 
                          checked={item.completed}
                          onChange={() => onToggleItem(currentTask.id, item.id)}
                          className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                        <span className={`text-base transition-all ${item.completed ? 'text-slate-400 line-through opacity-50' : 'text-slate-800 font-bold'}`}>
                          {item.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-4">
                <button 
                  onClick={() => onReplyFinished(selectedEmail.taskId)}
                  className="px-8 py-4 bg-slate-900 hover:bg-black text-white rounded-2xl font-black text-sm transition shadow-xl transform active:scale-95 flex items-center gap-3"
                >
                  <i className="fas fa-paper-plane"></i> Finalize Task
                </button>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-300">
              <i className="fas fa-envelope-open-text text-6xl mb-4 opacity-10"></i>
              <p className="font-bold uppercase tracking-widest text-sm">Select an inbox item to view details</p>
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

  useEffect(() => {
    const saved = {
      tasks: localStorage.getItem('remindme_tasks_v3'),
      emails: localStorage.getItem('remindme_emails_v3'),
      contacts: localStorage.getItem('remindme_contacts_v3'),
      sender: localStorage.getItem('remindme_sender_email_v3'),
      company: localStorage.getItem('remindme_company_name_v3'),
    };
    if (saved.tasks) setTasks(JSON.parse(saved.tasks));
    if (saved.emails) setEmails(JSON.parse(saved.emails));
    if (saved.contacts) setSavedContacts(JSON.parse(saved.contacts));
    if (saved.sender) setSenderEmail(saved.sender);
    if (saved.company) setCompanyName(saved.company);
  }, []);

  useEffect(() => {
    localStorage.setItem('remindme_tasks_v3', JSON.stringify(tasks));
    localStorage.setItem('remindme_emails_v3', JSON.stringify(emails));
    localStorage.setItem('remindme_contacts_v3', JSON.stringify(savedContacts));
    localStorage.setItem('remindme_sender_email_v3', senderEmail);
    localStorage.setItem('remindme_company_name_v3', companyName);
  }, [tasks, emails, savedContacts, senderEmail, companyName]);

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
      alert(`Imported ${foundEmails.length} new emails. Total: ${uniqueEmails.length}`);
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const clearContacts = () => {
    if (confirm("Clear all saved contacts?")) setSavedContacts([]);
  };

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

  const toggleComplete = useCallback((id: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id === id) {
        const newStatus = t.status === TaskStatus.PENDING ? TaskStatus.COMPLETED : TaskStatus.PENDING;
        setUndoToast({ visible: true, taskId: id, message: newStatus === TaskStatus.COMPLETED ? 'Task Silenced' : 'Task Reactivated' });
        return { ...t, status: newStatus };
      }
      return t;
    }));
  }, []);

  const toggleItem = useCallback((taskId: string, itemId: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        const updatedItems = t.items.map(item => 
          item.id === itemId ? { ...item, completed: !item.completed } : item
        );
        const allDone = updatedItems.every(i => i.completed);
        return { 
          ...t, 
          items: updatedItems,
          status: allDone ? TaskStatus.COMPLETED : t.status 
        };
      }
      return t;
    }));
  }, []);

  useEffect(() => {
    if (undoToast.visible) {
      const timer = setTimeout(() => setUndoToast(prev => ({ ...prev, visible: false })), 4000);
      return () => clearTimeout(timer);
    }
  }, [undoToast.visible]);

  useEffect(() => {
    const checkReminders = async () => {
      const now = Date.now();
      if (isProcessing) return;
      
      const due = tasks.filter(t => {
        if (t.status !== TaskStatus.PENDING) return false;
        const intervalMs = t.intervalHours * 3600000;
        return !t.lastReminderAt || (now - t.lastReminderAt) >= intervalMs;
      });

      if (due.length > 0) {
        setIsProcessing(true);
        for (const t of due) {
          const reminder = await generateReminderEmail(t.title, t.description, t.items, t.assigneeEmail, t.companyName || "Nudge Systems", t.reminderCount);
          const newEmail: SimulatedEmail = {
            id: uuidv4(),
            taskId: t.id,
            taskTitle: t.title,
            assigneeEmail: t.assigneeEmail,
            senderEmail: t.senderEmail,
            companyName: t.companyName,
            subject: reminder.subject,
            content: reminder.content,
            sentAt: Date.now(),
            isRead: false
          };
          setEmails(prev => [newEmail, ...prev]);
          setTasks(prev => prev.map(pt => pt.id === t.id ? { ...pt, lastReminderAt: Date.now(), reminderCount: pt.reminderCount + 1 } : pt));

          if ("Notification" in window && Notification.permission === "granted") {
            new Notification(`Nudge from ${t.companyName || 'Persistent Assistant'}`, { body: `Pending Checklist: ${t.title}` });
          }
        }
        setIsProcessing(false);
      }
    };
    const interval = setInterval(checkReminders, 5000); 
    return () => clearInterval(interval);
  }, [tasks, isProcessing]);

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  const filteredTasks = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return tasks.filter(t => !q || t.title.toLowerCase().includes(q) || t.assigneeEmail.toLowerCase().includes(q));
  }, [tasks, searchQuery]);

  const pendingTasks = filteredTasks.filter(t => t.status === TaskStatus.PENDING).sort((a,b) => (a.lastReminderAt||0) - (b.lastReminderAt||0));
  const completedTasks = filteredTasks.filter(t => t.status === TaskStatus.COMPLETED).sort((a,b) => b.createdAt - a.createdAt);

  return (
    <div className="h-screen flex flex-col md:flex-row bg-slate-50">
      <aside className="w-full md:w-72 bg-slate-900 text-white flex flex-col z-20">
        <div className="p-8 border-b border-slate-800">
          <div className="flex items-center gap-3 mb-1">
            <div className="bg-blue-600 w-10 h-10 rounded-xl flex items-center justify-center shadow-lg transform -rotate-6">
              <i className="fas fa-satellite-dish text-xl"></i>
            </div>
            <h1 className="text-xl font-black tracking-tighter">NUDGE.OS</h1>
          </div>
          <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">Persistence Engine v3.0</p>
        </div>

        <nav className="flex-1 p-6 space-y-2 overflow-y-auto">
          <button onClick={() => setCurrentView(AppView.TASKS)} className={`w-full flex items-center justify-between p-4 rounded-xl transition ${currentView === AppView.TASKS ? 'bg-blue-600 shadow-xl' : 'hover:bg-slate-800 text-slate-400'}`}>
            <span className="font-bold flex items-center gap-3"><i className="fas fa-layer-group"></i> Board</span>
            <span className="text-[10px] font-black bg-black/20 px-2 py-0.5 rounded-full">{pendingTasks.length}</span>
          </button>
          <button onClick={() => setCurrentView(AppView.INBOX)} className={`w-full flex items-center justify-between p-4 rounded-xl transition ${currentView === AppView.INBOX ? 'bg-blue-600 shadow-xl' : 'hover:bg-slate-800 text-slate-400'}`}>
            <span className="font-bold flex items-center gap-3"><i className="fas fa-envelope"></i> Inbox</span>
            <span className="text-[10px] font-black bg-black/20 px-2 py-0.5 rounded-full">{emails.length}</span>
          </button>

          <div className="pt-8 space-y-6">
            <div className="px-2">
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Authority Setup</h4>
              <div className="space-y-3">
                <input type="text" value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Company" className="w-full bg-slate-800 rounded-lg p-2 text-xs font-bold focus:ring-1 focus:ring-blue-500 outline-none" />
                <input type="email" value={senderEmail} onChange={e => setSenderEmail(e.target.value)} placeholder="Sender Email" className="w-full bg-slate-800 rounded-lg p-2 text-xs font-bold focus:ring-1 focus:ring-blue-500 outline-none" />
              </div>
            </div>

            <div className="px-2">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Saved Targets</h4>
                <button onClick={clearContacts} className="text-[9px] font-black text-red-500 uppercase hover:text-red-400 transition">Clear</button>
              </div>
              <div className="space-y-2">
                <label className="w-full flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 cursor-pointer transition text-[10px] font-black text-slate-300 uppercase">
                  <i className="fas fa-file-import text-blue-500"></i>
                  <span>Import CSV/TXT</span>
                  <input type="file" className="hidden" accept=".csv,.txt" onChange={handleFileUpload} ref={fileInputRef} />
                </label>
                <div className="text-[9px] font-bold text-slate-500 italic text-center">
                  {savedContacts.length} contacts archived
                </div>
              </div>
            </div>
          </div>
        </nav>
      </aside>

      <main className="flex-1 overflow-y-auto p-6 md:p-12 relative">
        {undoToast.visible && (
          <div className="fixed top-10 right-10 bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-6 z-50 animate-bounce border border-slate-700">
            <span className="font-black text-xs uppercase tracking-widest">{undoToast.message}</span>
            <button onClick={() => { toggleComplete(undoToast.taskId); setUndoToast(p => ({ ...p, visible: false })); }} className="text-[10px] font-black uppercase text-blue-400 border border-blue-400/30 px-2 py-1 rounded">Undo</button>
          </div>
        )}

        <div className="max-w-6xl mx-auto">
          {currentView === AppView.TASKS ? (
            <div className="space-y-12">
              <TaskForm onAddTask={addTask} savedContacts={savedContacts} senderEmail={senderEmail} companyName={companyName} />
              <div className="flex bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
                <i className="fas fa-search p-3 text-slate-300"></i>
                <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search directives..." className="flex-1 bg-transparent outline-none font-bold text-slate-600" />
              </div>

              <div className="space-y-10">
                <section>
                  <h2 className="text-sm font-black text-slate-400 uppercase tracking-[0.3em] mb-6 flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span> Active Directives
                  </h2>
                  <div className="grid grid-cols-1 gap-6">
                    {pendingTasks.map(t => <TaskCard key={t.id} task={t} onToggleComplete={toggleComplete} onToggleItem={toggleItem} />)}
                  </div>
                </section>
                <section className="opacity-60 grayscale">
                  <h2 className="text-sm font-black text-slate-400 uppercase tracking-[0.3em] mb-6">Terminated Tasks</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {completedTasks.map(t => <TaskCard key={t.id} task={t} onToggleComplete={toggleComplete} onToggleItem={toggleItem} />)}
                  </div>
                </section>
              </div>
            </div>
          ) : (
            <EmailView emails={emails} tasks={tasks} onToggleItem={toggleItem} onReplyFinished={toggleComplete} />
          )}
        </div>
      </main>
    </div>
  );
}
