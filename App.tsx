
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Task, TaskStatus, TaskItem, SimulatedEmail, AppView } from './types';
import { generateReminderEmail } from './services/geminiService';
import { v4 as uuidv4 } from 'uuid';

// Sub-components
const TaskForm: React.FC<{ 
  onAddTask: (task: Omit<Task, 'id' | 'createdAt' | 'lastReminderAt' | 'reminderCount' | 'status'>) => void,
  savedContacts: string[],
  senderEmail: string,
  companyName: string
}> = ({ onAddTask, savedContacts, senderEmail, companyName }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assigneeEmail, setAssigneeEmail] = useState('');
  const [interval, setInterval] = useState(24); // Default to Daily
  const [isBatchMode, setIsBatchMode] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const lines = description.split('\n').filter(l => l.trim().length > 0);
    const items: TaskItem[] = lines.length > 0 
      ? lines.map(text => ({ id: uuidv4(), text: text.replace(/^[-*]\s*/, '').trim(), completed: false }))
      : [{ id: uuidv4(), text: 'Complete the primary objective', completed: false }];

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
    setInterval(24);
    setIsBatchMode(false);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl shadow-xl border border-slate-200 mb-10 space-y-6">
      <div className="flex justify-between items-center pb-4 border-b border-slate-100">
        <h2 className="text-xl font-black text-slate-800 flex items-center gap-3">
          <i className="fas fa-plus-circle text-blue-600"></i> Deploy New Persistent Directive
        </h2>
        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-full">
          Source: {companyName || 'Nudge Assistant'}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-2">
          <label className="text-xs font-black uppercase text-slate-500 tracking-wider">Directive Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full p-3 rounded-xl border-2 border-slate-100 focus:border-blue-500 focus:ring-0 outline-none transition-all font-semibold"
            placeholder="e.g., Annual Security Review"
            required
          />
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-xs font-black uppercase text-slate-500 tracking-wider">Recipient Target</label>
            {savedContacts.length > 0 && (
              <button 
                type="button"
                onClick={() => setIsBatchMode(!isBatchMode)}
                className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${isBatchMode ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500 hover:bg-slate-300'}`}
              >
                {isBatchMode ? 'Batch Active' : 'Enable Batch'}
              </button>
            )}
          </div>
          {isBatchMode ? (
            <div className="w-full p-3 rounded-xl bg-blue-50 border-2 border-blue-200 text-blue-700 text-xs font-bold flex items-center gap-2 h-[52px]">
              <i className="fas fa-users"></i> Target: {savedContacts.length} Saved Contacts
            </div>
          ) : (
            <div className="relative">
              <input
                type="email"
                list="contacts-list"
                value={assigneeEmail}
                onChange={(e) => setAssigneeEmail(e.target.value)}
                className="w-full p-3 rounded-xl border-2 border-slate-100 focus:border-blue-500 focus:ring-0 outline-none transition-all font-semibold"
                placeholder="assignee@company.com"
                required={!isBatchMode}
              />
              <datalist id="contacts-list">
                {savedContacts.map(email => <option key={email} value={email} />)}
              </datalist>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-xs font-black uppercase text-slate-500 tracking-wider">Nudge Interval</label>
          <select
            value={interval}
            onChange={(e) => setInterval(Number(e.target.value))}
            className="w-full p-3 rounded-xl border-2 border-slate-100 focus:border-blue-500 focus:ring-0 outline-none bg-white transition-all font-semibold"
          >
            <optgroup label="High Priority">
              <option value={0.01}>Demo Mode (30s)</option>
              <option value={1}>Hourly</option>
              <option value={4}>Every 4 Hours</option>
            </optgroup>
            <optgroup label="Standard Cycle">
              <option value={24}>Daily</option>
              <option value={168}>Weekly</option>
            </optgroup>
            <optgroup label="Corporate Tempo">
              <option value={720}>Monthly</option>
              <option value={2160}>Quarterly</option>
              <option value={8760}>Yearly</option>
            </optgroup>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-black uppercase text-slate-500 tracking-wider">Required Actions (One per line)</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full p-4 rounded-xl border-2 border-slate-100 focus:border-blue-500 focus:ring-0 outline-none transition-all min-h-[120px] font-mono text-sm leading-relaxed"
          placeholder="Update profile picture&#10;Submit tax documents&#10;Confirm office attendance"
          rows={4}
        />
      </div>

      <button
        type="submit"
        className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl transition-all transform active:scale-95 flex items-center justify-center gap-3 shadow-lg shadow-blue-500/20"
      >
        <i className="fas fa-rocket"></i> INITIALIZE PERSISTENCE CYCLE
      </button>
    </form>
  );
};

const TaskCard: React.FC<{ 
  task: Task; 
  onToggleComplete: (id: string) => void;
  onToggleItem: (taskId: string, itemId: string) => void;
}> = ({ task, onToggleComplete, onToggleItem }) => {
  const nextReminderAt = (task.lastReminderAt || task.createdAt) + (task.intervalHours * 3600000);
  const nextReminderIn = Math.max(0, nextReminderAt - Date.now());

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
    return `${h}h Cycle`;
  };

  return (
    <div className={`group p-6 rounded-2xl border-2 transition-all duration-300 relative overflow-hidden ${isCompleted ? 'bg-slate-50 border-slate-200' : 'bg-white border-white shadow-lg hover:shadow-xl'}`}>
      {!isCompleted && (
        <div className="absolute top-0 left-0 h-1 bg-blue-500 transition-all duration-500 opacity-20 group-hover:opacity-100" style={{ width: `${progress}%` }}></div>
      )}
      
      <div className="flex gap-5">
        <div className="pt-1">
          <button 
            onClick={() => onToggleComplete(task.id)}
            className={`w-12 h-12 rounded-2xl border-2 flex items-center justify-center transition-all duration-300 ${isCompleted ? 'bg-green-500 border-green-500 text-white' : 'bg-white border-slate-100 text-transparent hover:border-green-400 hover:text-green-400'}`}
            title={isCompleted ? "Mark Pending" : "Mark Terminated"}
          >
            <i className={`fas fa-check-double text-lg ${isCompleted ? 'scale-100' : 'scale-75 opacity-0 hover:opacity-100'}`}></i>
          </button>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className={`font-black text-xl leading-tight mb-1 ${isCompleted ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{task.title}</h3>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-blue-600 flex items-center gap-1.5">
                  <i className="fas fa-user-circle opacity-70"></i> {task.assigneeEmail}
                </span>
              </div>
            </div>
            <div className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest ${isCompleted ? 'bg-slate-200 text-slate-500' : 'bg-blue-100 text-blue-700 animate-pulse'}`}>
              {isCompleted ? 'Silenced' : 'Monitoring'}
            </div>
          </div>
          
          <div className="space-y-3 mb-6">
            {task.items.map(item => (
              <label key={item.id} className="flex items-start gap-3 cursor-pointer group/item">
                <input 
                  type="checkbox" 
                  checked={item.completed}
                  onChange={() => onToggleItem(task.id, item.id)}
                  className="mt-1 w-5 h-5 rounded-lg border-2 border-slate-200 text-blue-600 focus:ring-0 transition-all cursor-pointer"
                />
                <span className={`text-sm leading-relaxed transition-all ${item.completed ? 'text-slate-400 line-through' : 'text-slate-700 font-medium group-hover/item:text-blue-600'}`}>
                  {item.text}
                </span>
              </label>
            ))}
          </div>

          <div className="flex justify-between items-center text-[11px] font-black text-slate-400 border-t border-slate-50 pt-4">
            <div className="flex gap-5 uppercase tracking-tighter">
              <span className="flex items-center gap-1.5"><i className="fas fa-paper-plane text-slate-300"></i> {task.reminderCount} Nudges</span>
              <span className="flex items-center gap-1.5"><i className="fas fa-redo text-slate-300"></i> {getFreqLabel(task.intervalHours)}</span>
            </div>
            {!isCompleted && (
              <span className="text-orange-500 font-black bg-orange-50 px-2 py-1 rounded-lg">
                <i className="fas fa-hourglass-half mr-1.5"></i> {hours}H {minutes}M
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
    <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col h-[calc(100vh-14rem)] overflow-hidden">
      <div className="p-5 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
        <h2 className="font-black text-slate-700 uppercase tracking-widest text-xs flex items-center gap-3">
          <i className="fas fa-inbox text-blue-500 text-lg"></i> Communications Hub
        </h2>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Monitoring</span>
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
        </div>
      </div>
      
      <div className="flex-1 flex overflow-hidden">
        {/* Inbox Sidebar */}
        <div className="w-1/3 border-r border-slate-100 overflow-y-auto bg-slate-50/30">
          {emails.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center">
              <i className="fas fa-cloud text-5xl text-slate-100 mb-4"></i>
              <p className="text-sm font-bold text-slate-300 italic">No activity detected.</p>
            </div>
          ) : (
            emails.map(email => (
              <div
                key={email.id}
                onClick={() => setSelectedEmail(email)}
                className={`p-5 border-b border-slate-50 cursor-pointer transition-all ${selectedEmail?.id === email.id ? 'bg-white shadow-md border-l-4 border-l-blue-600 z-10' : 'hover:bg-slate-50'}`}
              >
                <div className="flex justify-between mb-2">
                  <span className="text-[10px] font-black text-blue-600 uppercase tracking-tighter truncate w-32">{email.companyName}</span>
                  <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap">{new Date(email.sentAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                </div>
                <div className="text-sm font-black text-slate-800 mb-1 truncate">{email.subject}</div>
                <div className="text-xs text-slate-400 truncate">Target: {email.assigneeEmail}</div>
              </div>
            ))
          )}
        </div>

        {/* Reading Pane */}
        <div className="flex-1 bg-white p-10 overflow-y-auto">
          {selectedEmail ? (
            <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="pb-6 border-b border-slate-100">
                <h1 className="text-3xl font-black text-slate-900 leading-tight mb-6">{selectedEmail.subject}</h1>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white text-xl font-black shadow-lg">
                    {selectedEmail.companyName[0]}
                  </div>
                  <div>
                    <div className="text-sm font-black text-slate-800">{selectedEmail.companyName} Assistant</div>
                    <div className="text-xs text-slate-400 font-bold">{selectedEmail.senderEmail}</div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100 text-slate-700 leading-relaxed font-medium">
                <p className="whitespace-pre-wrap">{selectedEmail.content}</p>
              </div>

              {currentTask && (
                <div className="bg-white border-2 border-blue-500/10 p-8 rounded-3xl shadow-xl space-y-5">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-3">
                      <i className="fas fa-clipboard-check text-blue-500"></i> Local Task Verification
                    </h4>
                    <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded">Sync: Online</span>
                  </div>
                  <div className="space-y-3">
                    {currentTask.items.map(item => (
                      <label key={item.id} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all cursor-pointer group">
                        <input 
                          type="checkbox" 
                          checked={item.completed}
                          onChange={() => onToggleItem(currentTask.id, item.id)}
                          className="w-6 h-6 rounded-lg border-2 border-slate-200 text-blue-600 focus:ring-0 cursor-pointer"
                        />
                        <span className={`text-lg transition-all ${item.completed ? 'text-slate-300 line-through' : 'text-slate-800 font-bold group-hover:text-blue-600'}`}>
                          {item.text}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-4 pt-4">
                <button 
                  onClick={() => onReplyFinished(selectedEmail.taskId)}
                  className="flex-1 py-5 bg-slate-900 hover:bg-black text-white rounded-2xl font-black text-base transition-all shadow-2xl transform active:scale-95 flex items-center justify-center gap-3"
                >
                  <i className="fas fa-check-double text-green-400"></i> EXECUTE COMPLETION
                </button>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-200">
              <i className="fas fa-terminal text-8xl mb-6 opacity-5"></i>
              <p className="font-black uppercase tracking-[0.4em] text-sm opacity-20">Monitoring Network Traffic</p>
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

  // Persistence logic
  useEffect(() => {
    const saved = {
      tasks: localStorage.getItem('nudge_tasks_v1'),
      emails: localStorage.getItem('nudge_emails_v1'),
      contacts: localStorage.getItem('nudge_contacts_v1'),
      sender: localStorage.getItem('nudge_sender_v1'),
      company: localStorage.getItem('nudge_company_v1'),
    };
    if (saved.tasks) setTasks(JSON.parse(saved.tasks));
    if (saved.emails) setEmails(JSON.parse(saved.emails));
    if (saved.contacts) setSavedContacts(JSON.parse(saved.contacts));
    if (saved.sender) setSenderEmail(saved.sender);
    if (saved.company) setCompanyName(saved.company);
  }, []);

  useEffect(() => {
    localStorage.setItem('nudge_tasks_v1', JSON.stringify(tasks));
    localStorage.setItem('nudge_emails_v1', JSON.stringify(emails));
    localStorage.setItem('nudge_contacts_v1', JSON.stringify(savedContacts));
    localStorage.setItem('nudge_sender_v1', senderEmail);
    localStorage.setItem('nudge_company_v1', companyName);
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
      alert(`Asset Pool Updated: ${foundEmails.length} entries identified.`);
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
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
        setUndoToast({ visible: true, taskId: id, message: newStatus === TaskStatus.COMPLETED ? 'Cycle Silenced' : 'Cycle Reactivated' });
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
      const timer = setTimeout(() => setUndoToast(prev => ({ ...prev, visible: false })), 5000);
      return () => clearTimeout(timer);
    }
  }, [undoToast.visible]);

  // Core background processing logic (The "Backend" of the app)
  useEffect(() => {
    const processNudges = async () => {
      if (isProcessing) return;
      const now = Date.now();
      
      const dueTasks = tasks.filter(t => {
        if (t.status !== TaskStatus.PENDING) return false;
        const intervalMs = t.intervalHours * 3600000;
        const lastActivity = t.lastReminderAt || t.createdAt;
        return (now - lastActivity) >= intervalMs;
      });

      if (dueTasks.length > 0) {
        setIsProcessing(true);
        // Process sequentially to avoid API hammering
        for (const t of dueTasks) {
          try {
            const nudge = await generateReminderEmail(t.title, t.description, t.items, t.assigneeEmail, t.companyName || "Nudge Systems", t.reminderCount);
            
            const newEmail: SimulatedEmail = {
              id: uuidv4(),
              taskId: t.id,
              taskTitle: t.title,
              assigneeEmail: t.assigneeEmail,
              senderEmail: t.senderEmail || 'system@nudge.ai',
              companyName: t.companyName || 'Persistent Assistant',
              subject: nudge.subject,
              content: nudge.content,
              sentAt: Date.now(),
              isRead: false
            };

            setEmails(prev => [newEmail, ...prev]);
            setTasks(prev => prev.map(pt => pt.id === t.id ? { ...pt, lastReminderAt: Date.now(), reminderCount: pt.reminderCount + 1 } : pt));

            if ("Notification" in window && Notification.permission === "granted") {
              new Notification(`Persistence Alert: ${t.companyName || 'Assistant'}`, { 
                body: `Action Required: ${t.title}`,
                icon: 'https://cdn-icons-png.flaticon.com/512/565/565422.png'
              });
            }
          } catch (e) {
            console.error("Nudge failed for task:", t.id, e);
          }
        }
        setIsProcessing(false);
      }
    };

    const interval = setInterval(processNudges, 6000); // Check every 6 seconds
    return () => clearInterval(interval);
  }, [tasks, isProcessing]);

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // Compute filtered lists for display
  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return tasks.filter(t => !q || t.title.toLowerCase().includes(q) || t.assigneeEmail.toLowerCase().includes(q));
  }, [tasks, searchQuery]);

  // Advanced Sorting: Pending sorted by closest due date (last reminder + interval)
  const pendingTasks = useMemo(() => 
    filtered
      .filter(t => t.status === TaskStatus.PENDING)
      .sort((a,b) => {
        const nextA = (a.lastReminderAt || a.createdAt) + (a.intervalHours * 3600000);
        const nextB = (b.lastReminderAt || b.createdAt) + (b.intervalHours * 3600000);
        return nextA - nextB;
      }), 
  [filtered]);

  const completedTasks = useMemo(() => 
    filtered
      .filter(t => t.status === TaskStatus.COMPLETED)
      .sort((a,b) => b.createdAt - a.createdAt), 
  [filtered]);

  return (
    <div className="h-screen flex flex-col md:flex-row bg-slate-100 overflow-hidden font-sans">
      {/* Dynamic Nav Sidebar */}
      <aside className="w-full md:w-80 bg-slate-900 text-white flex flex-col z-20 shadow-2xl">
        <div className="p-8 pb-6 border-b border-slate-800">
          <div className="flex items-center gap-4 mb-2">
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 w-12 h-12 rounded-2xl flex items-center justify-center shadow-xl transform rotate-3 transition-transform hover:rotate-0">
              <i className="fas fa-satellite-dish text-2xl"></i>
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tighter leading-none">NUDGE.OS</h1>
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em] mt-1">Persistence v4.0</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-6 space-y-3 overflow-y-auto">
          <button 
            onClick={() => setCurrentView(AppView.TASKS)} 
            className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all duration-300 ${currentView === AppView.TASKS ? 'bg-blue-600 shadow-xl shadow-blue-900/40 text-white' : 'hover:bg-slate-800 text-slate-400'}`}
          >
            <span className="font-black text-sm uppercase tracking-widest flex items-center gap-4">
              <i className="fas fa-layer-group text-lg"></i> Directives
            </span>
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${currentView === AppView.TASKS ? 'bg-white text-blue-600' : 'bg-slate-800'}`}>
              {pendingTasks.length}
            </span>
          </button>
          
          <button 
            onClick={() => setCurrentView(AppView.INBOX)} 
            className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all duration-300 ${currentView === AppView.INBOX ? 'bg-blue-600 shadow-xl shadow-blue-900/40 text-white' : 'hover:bg-slate-800 text-slate-400'}`}
          >
            <span className="font-black text-sm uppercase tracking-widest flex items-center gap-4">
              <i className="fas fa-network-wired text-lg"></i> Activity
            </span>
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${currentView === AppView.INBOX ? 'bg-white text-blue-600' : 'bg-slate-800'}`}>
              {emails.length}
            </span>
          </button>

          <div className="pt-10 space-y-8">
            <div className="px-2">
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Authority Config</h4>
              <div className="space-y-4">
                <div>
                  <label className="text-[9px] font-black text-slate-600 uppercase block mb-1">Company Persona</label>
                  <input type="text" value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="e.g. Acme Compliance" className="w-full bg-slate-800/50 border border-slate-700 rounded-xl p-3 text-xs font-bold focus:ring-1 focus:ring-blue-500 outline-none transition-all" />
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-600 uppercase block mb-1">Authenticated Email</label>
                  <input type="email" value={senderEmail} onChange={e => setSenderEmail(e.target.value)} placeholder="auth@acme.com" className="w-full bg-slate-800/50 border border-slate-700 rounded-xl p-3 text-xs font-bold focus:ring-1 focus:ring-blue-500 outline-none transition-all" />
                </div>
              </div>
            </div>

            <div className="px-2">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Asset Pool</h4>
                {savedContacts.length > 0 && (
                  <button onClick={() => setSavedContacts([])} className="text-[8px] font-black text-red-500 hover:text-red-400 uppercase tracking-tighter">Wipe Pool</button>
                )}
              </div>
              <label className="w-full flex items-center justify-center gap-3 p-4 rounded-2xl bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/20 cursor-pointer transition-all text-[10px] font-black text-blue-400 uppercase tracking-widest group">
                <i className="fas fa-file-import group-hover:animate-bounce"></i>
                <span>Import CSV Pool</span>
                <input type="file" className="hidden" accept=".csv,.txt" onChange={handleFileUpload} ref={fileInputRef} />
              </label>
              <div className="mt-3 text-[9px] font-bold text-slate-500 italic text-center">
                {savedContacts.length} verified targets in memory
              </div>
            </div>
          </div>
        </nav>
        
        <div className="p-6 border-t border-slate-800 text-center">
          <div className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] mb-1">System Status</div>
          <div className="flex items-center justify-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 shadow-lg shadow-green-500/50"></span>
            <span className="text-[10px] font-bold text-slate-400">CORE SYNC ACTIVE</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-6 md:p-12 relative bg-slate-50">
        {undoToast.visible && (
          <div className="fixed top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-8 py-4 rounded-3xl shadow-2xl flex items-center gap-8 z-50 animate-in slide-in-from-top-4 duration-300 border border-slate-700">
            <span className="font-black text-xs uppercase tracking-widest">{undoToast.message}</span>
            <button 
              onClick={() => { toggleComplete(undoToast.taskId); setUndoToast(p => ({ ...p, visible: false })); }} 
              className="text-[10px] font-black uppercase text-blue-400 border border-blue-400/30 px-3 py-1.5 rounded-xl hover:bg-blue-500/10 transition-all"
            >
              Undo Action
            </button>
          </div>
        )}

        <div className="max-w-6xl mx-auto pb-24">
          {currentView === AppView.TASKS ? (
            <div className="space-y-12 animate-in fade-in duration-500">
              <TaskForm 
                onAddTask={addTask} 
                savedContacts={savedContacts} 
                senderEmail={senderEmail} 
                companyName={companyName} 
              />
              
              <div className="flex bg-white p-2 rounded-2xl border border-slate-200 shadow-sm transition-all focus-within:shadow-md focus-within:border-blue-400">
                <div className="flex-1 flex items-center">
                  <i className="fas fa-search p-4 text-slate-300"></i>
                  <input 
                    type="text" 
                    value={searchQuery} 
                    onChange={e => setSearchQuery(e.target.value)} 
                    placeholder="Filter by title, target, or directive scope..." 
                    className="flex-1 bg-transparent outline-none font-bold text-slate-700 placeholder:text-slate-300" 
                  />
                </div>
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="p-4 text-xs font-black text-slate-400 hover:text-slate-600">RESET</button>
                )}
              </div>

              <div className="grid grid-cols-1 gap-12">
                <section>
                  <div className="flex items-center justify-between mb-8 border-b-2 border-slate-200 pb-2">
                    <h2 className="text-sm font-black text-slate-900 uppercase tracking-[0.4em] flex items-center gap-4">
                      <span className="w-3 h-3 rounded-full bg-blue-600 shadow-lg shadow-blue-500/50"></span> Active Directives
                    </h2>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Priority Sorted</span>
                  </div>
                  {pendingTasks.length === 0 ? (
                    <div className="p-20 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200 text-slate-400">
                      <i className="fas fa-shield-alt text-7xl mb-6 opacity-5"></i>
                      <p className="font-black text-lg text-slate-300 uppercase tracking-widest">No active monitoring required.</p>
                      <p className="text-sm mt-2 opacity-50">Create a new directive to start the persistence cycle.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-8">
                      {pendingTasks.map(t => <TaskCard key={t.id} task={t} onToggleComplete={toggleComplete} onToggleItem={toggleItem} />)}
                    </div>
                  )}
                </section>

                {completedTasks.length > 0 && (
                  <section className="opacity-50 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-500">
                    <div className="flex items-center justify-between mb-8 border-b-2 border-slate-200 pb-2">
                      <h2 className="text-sm font-black text-slate-400 uppercase tracking-[0.4em]">Terminated Cycles</h2>
                      <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{completedTasks.length} Archived</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {completedTasks.map(t => <TaskCard key={t.id} task={t} onToggleComplete={toggleComplete} onToggleItem={toggleItem} />)}
                    </div>
                  </section>
                )}
              </div>
            </div>
          ) : (
            <div className="animate-in slide-in-from-bottom-6 duration-700">
              <EmailView emails={emails} tasks={tasks} onToggleItem={toggleItem} onReplyFinished={toggleComplete} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
