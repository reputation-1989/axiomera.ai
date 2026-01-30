import React, { useState, useEffect, useRef } from 'react';
import { create } from 'zustand';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, onSnapshot, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { 
  Zap, Plus, Brain, Image as ImageIcon, Loader2, Wifi, ShieldAlert, 
  Sparkles, Cpu, Copy, ExternalLink, Settings2, Fingerprint, Activity, 
  Radio, Moon, Sun, Trash2, GraduationCap, Code, Search, ChevronDown, Layout, Send, Terminal, Check
} from 'lucide-react';

const CORE_CONFIG = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const FREE_MODELS = [
  { id: "meta-llama/llama-3.3-70b-instruct:free", name: "Llama 3.3 70B", provider: "Meta" },
  { id: "google/gemma-2-9b-it:free", name: "Gemma 2 9B", provider: "Google" },
  { id: "mistralai/mistral-7b-instruct:free", name: "Mistral 7B", provider: "Mistral" },
  { id: "microsoft/phi-3-mini-128k-instruct:free", name: "Phi 3 Mini", provider: "Microsoft" },
  { id: "qwen/qwen-2-7b-instruct:free", name: "Qwen 2 7B", provider: "Alibaba" }
];

const MODES = [
  { id: 'general', label: 'General', icon: Layout },
  { id: 'academic', label: 'Academic', icon: GraduationCap },
  { id: 'research', label: 'Research', icon: Search },
  { id: 'coding', label: 'Coding', icon: Code }
];

const useStore = create((set) => ({
  conversations: [], activeId: null, isLoading: false, user: null, 
  preset: 'general', theme: 'dark', selectedModels: [FREE_MODELS[0].id],
  setUser: (user) => set({ user }),
  setConversations: (convos) => set({ conversations: convos }),
  setActiveId: (id) => set({ activeId: id }),
  setLoading: (l) => set({ isLoading: l }),
  setPreset: (p) => set({ preset: p }),
  setTheme: (t) => set({ theme: t }),
  toggleModel: (id) => set((state) => ({
    selectedModels: state.selectedModels.includes(id) 
      ? (state.selectedModels.length > 1 ? state.selectedModels.filter(m => m !== id) : state.selectedModels)
      : [...state.selectedModels, id].slice(0, 2)
  }))
}));

export default function App() {
  const s = useStore();
  const setUser = useStore(state => state.setUser);
  const userUid = useStore(state => state.user?.uid);
  const setConversations = useStore(state => state.setConversations);
  const setActiveId = useStore(state => state.setActiveId);
  const [input, setInput] = useState("");
  const [showTrace, setShowTrace] = useState(null);
  const scrollRef = useRef(null);
  const dbRef = useRef(null);

  useEffect(() => {
    try {
      const app = !getApps().length ? initializeApp(CORE_CONFIG) : getApp();
      dbRef.current = getFirestore(app);
      const auth = getAuth(app);
      onAuthStateChanged(auth, (u) => setUser(u));
      signInAnonymously(auth);
    } catch (e) { console.error(e); }
  }, [setUser]);

  useEffect(() => {
    if (!userUid || !dbRef.current) return;
    const col = collection(dbRef.current, 'artifacts', 'room-ai-production', 'users', userUid, 'conversations');
    return onSnapshot(col, (sn) => {
      const list = sn.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => (b.createdAt || 0) - (a.createdAt || 0));
      setConversations(list);
      const currentActiveId = useStore.getState().activeId;
      if (!currentActiveId && list.length > 0) setActiveId(list[0].id);
    });
  }, [userUid, setConversations, setActiveId]);

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [s.conversations, s.isLoading]);

  const handleSend = async () => {
    if (!input.trim() || s.isLoading || !s.activeId) return;
    const p = input; setInput("");
    const convo = s.conversations.find(c => c.id === s.activeId);
    const addMsg = async (role, content, meta = {}) => {
      const msgs = [...(convo.messages || []), { role, content, metadata: meta, timestamp: Date.now() }];
      await updateDoc(doc(dbRef.current, 'artifacts', 'room-ai-production', 'users', s.user.uid, 'conversations', s.activeId), { messages: msgs });
    };
    s.setLoading(true);
    await addMsg("user", p);
    try {
      const res = await fetch("/api/debate", { 
        method: "POST", headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ prompt: p, selectedModels: s.selectedModels, history: convo.messages, preset: s.preset }) 
      });
      const data = await res.json();
      await addMsg("assistant", data.finalAnswer, { sources: data.metadata?.sources, transcript: data.transcript });
    } catch (e) { console.error(e); await addMsg("assistant", "Neural Link Timeout."); }
    s.setLoading(false);
  };

  return (
    <div className={`flex h-screen transition-all duration-700 ${s.theme === 'dark' ? 'bg-[#030303] text-zinc-100' : 'bg-white text-zinc-900'}`}>
      <aside className={`w-72 border-r flex flex-col transition-all duration-500 ${s.theme === 'dark' ? 'border-white/5 bg-[#080808]' : 'border-zinc-200 bg-zinc-50'}`}>
        <div className="p-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-600/20"><Zap size={22} className="text-white fill-current" /></div>
            <span className="font-black text-xl tracking-tighter">room.ai</span>
          </div>
          <button onClick={() => s.setTheme(s.theme === 'dark' ? 'light' : 'dark')} className="p-2.5 rounded-xl hover:bg-zinc-500/10 transition-all">
            {s.theme === 'dark' ? <Sun size={20}/> : <Moon size={20}/>}
          </button>
        </div>
        <button onClick={async () => {
          const ref = await addDoc(collection(dbRef.current, 'artifacts', 'room-ai-production', 'users', s.user.uid, 'conversations'), { 
            title: 'New Investigation', createdAt: Date.now(), messages: [], selectedModels: s.selectedModels 
          });
          s.setActiveId(ref.id);
        }} className="mx-6 p-4 bg-blue-600 rounded-2xl text-[11px] font-black uppercase text-white shadow-xl shadow-blue-600/30 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 mb-8">
          <Plus size={18} /> New Investigation
        </button>
        <div className="flex-1 overflow-y-auto px-4 space-y-1 no-scrollbar">
          {s.conversations.map(c => (
            <div key={c.id} className="group relative">
              <button onClick={() => s.setActiveId(c.id)} className={`w-full p-4 rounded-2xl text-[13px] text-left truncate transition-all ${c.id === s.activeId ? (s.theme === 'dark' ? 'bg-white/5 text-blue-400 border border-white/5 font-bold' : 'bg-white text-blue-600 shadow-sm border border-zinc-200 font-bold') : 'text-zinc-500 hover:bg-zinc-500/5'}`}>
                {c.title || 'Untitled Session'}
              </button>
              <button onClick={async (e) => { e.stopPropagation(); await deleteDoc(doc(dbRef.current, 'artifacts', 'room-ai-production', 'users', s.user.uid, 'conversations', c.id)) }} className="absolute right-3 top-3.5 opacity-0 group-hover:opacity-100 p-2 text-zinc-600 hover:text-red-500 transition-all"><Trash2 size={14}/></button>
            </div>
          ))}
        </div>
        <div className="p-8 border-t border-white/5">
          <div className="flex items-center gap-3"><Activity size={16} className="text-blue-500 animate-pulse" /><span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Core v3.0</span></div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col relative overflow-hidden">
        <header className={`h-24 border-b flex items-center px-10 justify-between backdrop-blur-3xl z-20 ${s.theme === 'dark' ? 'border-white/5 bg-black/40' : 'border-zinc-200 bg-white/80'}`}>
          <div className="flex items-center gap-10">
            <div className={`flex gap-1 p-1.5 rounded-2xl border transition-all ${s.theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-zinc-100 border-zinc-200'}`}>
              {MODES.map(m => {
                const Icon = m.icon;
                return (
                  <button key={m.id} onClick={() => s.setPreset(m.id)} className={`flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${s.preset === m.id ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20' : 'text-zinc-500 hover:text-zinc-400'}`}>
                    <Icon size={14}/> {m.label}
                  </button>
                )
              })}
            </div>
            <div className="relative group">
              <button className={`flex items-center gap-3 text-[11px] font-black uppercase px-6 py-3 rounded-xl border transition-all ${s.theme === 'dark' ? 'border-white/10 hover:border-blue-500' : 'border-zinc-200 hover:border-blue-600'}`}>
                <ShieldAlert size={16} className="text-blue-500" /> Council ({s.selectedModels.length}) <ChevronDown size={14}/>
              </button>
              <div className="absolute top-full left-0 mt-3 w-80 bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 pointer-events-none group-hover:pointer-events-auto transition-all p-3 z-50">
                {FREE_MODELS.map(m => (
                  <button key={m.id} onClick={() => s.toggleModel(m.id)} className={`w-full text-left p-3.5 rounded-xl transition-all mb-1 flex items-center justify-between ${s.selectedModels.includes(m.id) ? 'bg-blue-600/20 border border-blue-600/30' : 'hover:bg-white/5'}`}>
                    <div><div className={`font-bold text-xs ${s.selectedModels.includes(m.id) ? 'text-blue-400' : 'text-white'}`}>{m.name}</div><div className="text-[9px] text-zinc-500 font-mono">{m.provider}</div></div>
                    {s.selectedModels.includes(m.id) && <Check size={16} className="text-blue-500" />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-12 space-y-16 no-scrollbar scroll-smooth">
          {s.conversations.find(c => c.id === s.activeId)?.messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-8 duration-700`}>
              <div className={`max-w-[75%] ${m.role === 'user' ? 'bg-blue-600 p-8 rounded-[3rem] shadow-2xl text-white font-medium text-lg' : 'space-y-8 w-full'}`}>
                {m.role === 'assistant' ? (
                  <div className="space-y-8">
                    <div className="text-[20px] leading-[1.85] font-light text-zinc-200">{m.content}</div>
                    <div className="flex flex-wrap gap-2 pt-8 border-t border-white/5">
                       {m.metadata?.sources?.map((src, idx) => (<a key={idx} href={src.url} target="_blank" className="px-4 py-2 bg-zinc-500/10 rounded-full text-[10px] font-bold text-zinc-500 hover:text-blue-500 border border-white/5 flex items-center gap-2"><ExternalLink size={12}/> {src.title.slice(0, 20)}</a>))}
                       {m.metadata?.transcript && <button onClick={() => setShowTrace(m)} className="ml-auto p-3.5 rounded-2xl bg-zinc-500/5 text-zinc-500 hover:text-blue-500 transition-all border border-white/5"><Terminal size={22}/></button>}
                    </div>
                  </div>
                ) : m.content}
              </div>
            </div>
          ))}
        </div>

        <div className="p-12 pb-16">
          <div className="max-w-5xl mx-auto flex items-end gap-5 relative group">
            <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())} placeholder="Consult the Specialist Council..." className={`w-full border rounded-[3.5rem] p-10 text-2xl focus:outline-none transition-all shadow-2xl resize-none min-h-[160px] leading-relaxed ${s.theme === 'dark' ? 'bg-[#111] border-white/10 focus:border-blue-600 text-white' : 'bg-white border-zinc-200 focus:border-blue-500 text-zinc-900'}`} />
            <button onClick={handleSend} className="absolute right-10 bottom-10 p-7 bg-blue-600 rounded-[2.5rem] text-white hover:bg-blue-500 active:scale-95 transition-all shadow-2xl shadow-blue-600/40"><Send size={36}/></button>
          </div>
        </div>
      </main>

      {showTrace && (
        <aside className={`w-[600px] border-l p-16 flex flex-col space-y-12 animate-in slide-in-from-right duration-700 backdrop-blur-3xl z-50 shadow-2xl ${s.theme === 'dark' ? 'bg-[#080808]/95 border-white/10' : 'bg-white/95 border-zinc-200'}`}>
          <div className="flex justify-between items-center border-b border-white/5 pb-10"><h3 className="text-[12px] font-black uppercase text-blue-500 tracking-widest">forensics_trace</h3><button onClick={() => setShowTrace(null)} className="text-zinc-500 hover:text-white">✕</button></div>
          <div className="flex-1 overflow-y-auto space-y-12 no-scrollbar">
            {showTrace.metadata.transcript.map((step, idx) => (
              <div key={idx} className="space-y-6"><div className="text-[11px] font-black text-zinc-700 uppercase tracking-widest">{step.phase}</div><div className="p-8 bg-white/5 rounded-[2.5rem] text-[15px] font-mono text-zinc-400 border border-white/5 leading-relaxed shadow-inner">{step.output}</div></div>
            ))}
          </div>
        </aside>
      )}
    </div>
  );
}