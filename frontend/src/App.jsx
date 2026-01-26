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
  apiKey: "AIzaSyBWuV0MeqZNdwCtGD385N3HjIj_3ni8Uic",
  authDomain: "room-ai-5f04a.firebaseapp.com",
  projectId: "room-ai-5f04a",
  storageBucket: "room-ai-5f04a.firebasestorage.app",
  messagingSenderId: "9408101224",
  appId: "1:9408101224:web:2cefe9a2e95dd205f674dd"
};

const FREE_MODELS = [
  { id: "meta-llama/llama-3.3-70b-instruct:free", name: "Llama 3.3 70B", provider: "Meta" },
  { id: "google/gemma-2-9b-it:free", name: "Gemma 2 9B", provider: "Google" },
  { id: "mistralai/mistral-7b-instruct:free", name: "Mistral 7B", provider: "Mistral" },
  { id: "microsoft/phi-3-mini-128k-instruct:free", name: "Phi 3 Mini", provider: "Microsoft" },
  { id: "qwen/qwen-2-7b-instruct:free", name: "Qwen 2 7B", provider: "Alibaba" },
  { id: "huggingfaceh4/zephyr-7b-beta:free", name: "Zephyr 7B", provider: "HuggingFace" }
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
  const [input, setInput] = useState("");
  const [showTrace, setShowTrace] = useState(null);
  const scrollRef = useRef(null);
  const dbRef = useRef(null);

  useEffect(() => {
    try {
      const app = !getApps().length ? initializeApp(CORE_CONFIG) : getApp();
      dbRef.current = getFirestore(app);
      const auth = getAuth(app);
      onAuthStateChanged(auth, (u) => s.setUser(u));
      signInAnonymously(auth);
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => {
    if (!s.user || !dbRef.current) return;
    const col = collection(dbRef.current, 'artifacts', 'room-ai-production', 'users', s.user.uid, 'conversations');
    return onSnapshot(col, async (sn) => {
      const list = sn.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => (b.createdAt || 0) - (a.createdAt || 0));

      if (list.length === 0) {
         await addDoc(col, {
            title: 'New Investigation', createdAt: Date.now(), messages: [], selectedModels: s.selectedModels
          });
         return;
      }

      s.setConversations(list);
      if (!s.activeId || !list.find(c => c.id === s.activeId)) {
        s.setActiveId(list[0].id);
      }
    });
  }, [s.user?.uid]);

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [s.conversations, s.isLoading]);

  const handleSend = async () => {
    if (!input.trim() || s.isLoading || !s.activeId) return;
    const convo = s.conversations.find(c => c.id === s.activeId);
    if (!convo) return;

    const p = input; setInput("");
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
    } catch (e) { await addMsg("assistant", "Neural Link Timeout."); }
    s.setLoading(false);
  };

  const MessageBubble = ({ msg }) => {
    if (msg.role === 'user') {
      return (
        <div className="flex justify-end animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="max-w-[80%] bg-blue-600 p-6 rounded-[2rem] rounded-tr-none shadow-lg text-white font-medium text-lg tracking-wide">
            {msg.content}
          </div>
        </div>
      );
    }

    const transcript = msg.metadata?.transcript || [];
    const isDebate = transcript.some(t => t.phase === 'critique');

    return (
      <div className="flex justify-start animate-in fade-in slide-in-from-bottom-4 duration-700 w-full">
        <div className="w-full space-y-6">

            {/* Phase 1: Research / Grounding */}
            {msg.metadata?.sources?.length > 0 && (
                <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                    {msg.metadata.sources.map((src, i) => (
                        <a key={i} href={src.url} target="_blank" className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider hover:bg-emerald-500/20 transition-all">
                            <Wifi size={12} className="animate-pulse"/> {src.title.slice(0, 25)}
                        </a>
                    ))}
                </div>
            )}

            {/* Phase 2: The Debate (Visualized) */}
            {isDebate && (
                <div className="grid grid-cols-2 gap-6 p-6 rounded-[2.5rem] bg-white/5 border border-white/5 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-50" />

                    {/* Agent A */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-blue-400">
                            <Brain size={16} />
                            <span className="text-xs font-black uppercase tracking-widest">Architect</span>
                        </div>
                        <div className="p-4 rounded-2xl bg-black/20 text-sm text-zinc-400 border border-white/5 h-32 overflow-y-auto custom-scrollbar">
                           {transcript.find(t => t.phase === 'solutions')?.modelA?.content?.slice(0, 200)}...
                        </div>
                    </div>

                     {/* Agent B */}
                     <div className="space-y-4">
                        <div className="flex items-center gap-2 text-pink-400">
                            <ShieldAlert size={16} />
                            <span className="text-xs font-black uppercase tracking-widest">Auditor</span>
                        </div>
                        <div className="p-4 rounded-2xl bg-black/20 text-sm text-zinc-400 border border-white/5 h-32 overflow-y-auto custom-scrollbar">
                           {transcript.find(t => t.phase === 'solutions')?.modelB?.content?.slice(0, 200)}...
                        </div>
                    </div>

                    <button onClick={() => setShowTrace(msg)} className="col-span-2 text-center text-[10px] text-zinc-500 hover:text-white uppercase tracking-widest font-bold mt-2 transition-all">
                        View Full 3-Round Debate Log
                    </button>
                </div>
            )}

            {/* Phase 3: Final Answer */}
            <div className={`p-8 rounded-[2.5rem] rounded-tl-none shadow-2xl ${s.theme === 'dark' ? 'bg-[#111] border border-white/10' : 'bg-white border border-zinc-200'}`}>
                <div className="prose prose-invert max-w-none text-zinc-300 leading-relaxed whitespace-pre-wrap font-light text-lg">
                    {msg.content}
                </div>
                {!isDebate && msg.metadata?.transcript && (
                     <div className="mt-6 pt-6 border-t border-white/5 flex justify-end">
                        <button onClick={() => setShowTrace(msg)} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-blue-500 transition-all">
                            <Terminal size={14} /> Inspect Council Trace
                        </button>
                     </div>
                )}
            </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`flex h-screen transition-all duration-700 ${s.theme === 'dark' ? 'bg-[#030303] text-zinc-100' : 'bg-white text-zinc-900'}`}>
      <aside className={`w-80 border-r flex flex-col transition-all duration-500 ${s.theme === 'dark' ? 'border-white/5 bg-[#080808]' : 'border-zinc-200 bg-zinc-50'}`}>
        <div className="p-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(37,99,235,0.3)]"><Zap size={22} className="text-white fill-current" /></div>
            <div>
                <div className="font-black text-xl tracking-tighter leading-none">room.ai</div>
                <div className="text-[9px] font-bold text-blue-500 tracking-widest uppercase mt-1">Multi-Agent Engine</div>
            </div>
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
        <div className="flex-1 overflow-y-auto px-4 space-y-1 custom-scrollbar">
          {s.conversations.map(c => (
            <div key={c.id} className="group relative">
              <button onClick={() => s.setActiveId(c.id)} className={`w-full p-4 rounded-2xl text-[13px] text-left truncate transition-all ${c.id === s.activeId ? (s.theme === 'dark' ? 'bg-white/5 text-blue-400 border border-white/5 font-bold' : 'bg-white text-blue-600 shadow-sm border border-zinc-200 font-bold') : 'text-zinc-500 hover:bg-zinc-500/5'}`}>
                {c.title || 'Untitled Session'}
              </button>
              <button onClick={async (e) => { e.stopPropagation(); await deleteDoc(doc(dbRef.current, 'artifacts', 'room-ai-production', 'users', s.user.uid, 'conversations', c.id)) }} className="absolute right-3 top-3.5 opacity-0 group-hover:opacity-100 p-2 text-zinc-600 hover:text-red-500 transition-all"><Trash2 size={14}/></button>
            </div>
          ))}
        </div>
      </aside>

      <main className="flex-1 flex flex-col relative overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/10 via-transparent to-transparent">
        <header className={`h-24 flex items-center px-10 justify-between z-20`}>
          <div className="flex items-center gap-6">
            <div className={`flex gap-1 p-1.5 rounded-2xl border transition-all ${s.theme === 'dark' ? 'bg-black/40 border-white/5 backdrop-blur-md' : 'bg-zinc-100 border-zinc-200'}`}>
              {MODES.map(m => {
                const Icon = m.icon;
                return (
                  <button key={m.id} onClick={() => s.setPreset(m.id)} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${s.preset === m.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-zinc-500 hover:text-zinc-400'}`}>
                    <Icon size={14}/> {m.label}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="relative group z-50">
              <button className={`flex items-center gap-3 text-[11px] font-black uppercase px-6 py-3 rounded-xl border transition-all ${s.theme === 'dark' ? 'bg-black/40 border-white/10 hover:border-blue-500 text-zinc-300' : 'bg-white border-zinc-200 hover:border-blue-600'}`}>
                <ShieldAlert size={16} className={s.selectedModels.length > 1 ? "text-purple-500 animate-pulse" : "text-zinc-500"} />
                {s.selectedModels.length > 1 ? "Debate Mode Active" : "Council Mode"}
                <span className="bg-white/10 px-2 py-0.5 rounded text-[9px]">{s.selectedModels.length}</span>
                <ChevronDown size={14}/>
              </button>
              <div className="absolute top-full right-0 mt-3 w-80 bg-[#0A0A0A] border border-white/10 rounded-2xl shadow-2xl opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 pointer-events-none group-hover:pointer-events-auto transition-all p-2 z-50">
                <div className="px-4 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest border-b border-white/5 mb-2">Select Agents</div>
                {FREE_MODELS.map(m => (
                  <button key={m.id} onClick={() => s.toggleModel(m.id)} className={`w-full text-left p-3 rounded-xl transition-all mb-1 flex items-center justify-between group/item ${s.selectedModels.includes(m.id) ? 'bg-blue-600/10 border border-blue-600/20' : 'hover:bg-white/5 border border-transparent'}`}>
                    <div>
                        <div className={`font-bold text-xs ${s.selectedModels.includes(m.id) ? 'text-blue-400' : 'text-zinc-300 group-hover/item:text-white'}`}>{m.name}</div>
                        <div className="text-[9px] text-zinc-600 font-mono mt-0.5">{m.provider}</div>
                    </div>
                    {s.selectedModels.includes(m.id) && <Check size={14} className="text-blue-500" />}
                  </button>
                ))}
                {s.selectedModels.length > 1 && <div className="p-3 text-[10px] text-purple-400 text-center bg-purple-500/10 rounded-xl mt-2 border border-purple-500/20">Multi-Agent Debate Enabled</div>}
              </div>
          </div>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-20 py-10 space-y-12 custom-scrollbar scroll-smooth">
          {s.conversations.find(c => c.id === s.activeId)?.messages.map((m, i) => (
             <MessageBubble key={i} msg={m} />
          ))}
          {s.isLoading && (
              <div className="flex items-center gap-4 text-zinc-500 pl-4 animate-pulse">
                 <Loader2 size={20} className="animate-spin text-blue-500"/>
                 <span className="text-xs font-bold uppercase tracking-widest">Orchestrating Debate...</span>
              </div>
          )}
        </div>

        <div className="px-20 pb-12 pt-6">
          <div className="max-w-4xl mx-auto flex items-end gap-4 relative group">
            <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())} placeholder="Consult the Specialist Council..." className={`w-full border rounded-[2rem] p-8 text-xl focus:outline-none transition-all shadow-2xl resize-none min-h-[120px] leading-relaxed ${s.theme === 'dark' ? 'bg-[#111] border-white/10 focus:border-blue-600 text-white placeholder-zinc-700' : 'bg-white border-zinc-200 focus:border-blue-500 text-zinc-900'}`} />
            <div className="absolute right-6 bottom-6 flex gap-2">
                 <button onClick={handleSend} className={`p-4 rounded-full transition-all shadow-lg ${input.trim() ? 'bg-blue-600 text-white hover:scale-110 active:scale-95 shadow-blue-600/20' : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'}`}>
                    <Send size={24} className={input.trim() ? "fill-current" : ""}/>
                </button>
            </div>
          </div>
          <div className="text-center mt-6 text-[10px] font-bold text-zinc-700 uppercase tracking-[0.2em]">
             Powered by <span className="text-blue-600">OpenRouter</span> & <span className="text-purple-600">Room AI Engine</span>
          </div>
        </div>
      </main>

      {showTrace && (
        <aside className={`w-[600px] border-l flex flex-col animate-in slide-in-from-right duration-500 backdrop-blur-3xl z-50 shadow-2xl ${s.theme === 'dark' ? 'bg-[#050505]/95 border-white/10' : 'bg-white/95 border-zinc-200'}`}>
          <div className="flex justify-between items-center p-8 border-b border-white/5">
              <div>
                  <h3 className="text-sm font-black uppercase text-white tracking-widest">Debate Transcript</h3>
                  <div className="text-[10px] text-zinc-500 mt-1 font-mono">{showTrace.metadata?.duration || "0.00"}s execution time</div>
              </div>
              <button onClick={() => setShowTrace(null)} className="p-2 rounded-full hover:bg-white/10 transition-all text-zinc-500 hover:text-white">✕</button>
          </div>
          <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
            {showTrace.metadata.transcript.map((step, idx) => (
              <div key={idx} className="space-y-4 group">
                <div className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                    <div className="text-[10px] font-black text-blue-400 uppercase tracking-widest">{step.phase}</div>
                    <div className="h-px flex-1 bg-white/5 group-hover:bg-white/10 transition-all" />
                </div>

                {step.modelA ? (
                    <div className="grid gap-4">
                         {/* Model A Output */}
                         <div className="bg-blue-500/5 border border-blue-500/10 p-5 rounded-xl">
                            <div className="text-[9px] font-bold text-blue-400 uppercase tracking-wider mb-2">Architect</div>
                            <div className="text-[13px] font-mono text-zinc-400 leading-relaxed whitespace-pre-wrap">{step.modelA.content || JSON.stringify(step.modelA)}</div>
                         </div>
                         {/* Model B Output */}
                         <div className="bg-pink-500/5 border border-pink-500/10 p-5 rounded-xl">
                            <div className="text-[9px] font-bold text-pink-400 uppercase tracking-wider mb-2">Auditor</div>
                            <div className="text-[13px] font-mono text-zinc-400 leading-relaxed whitespace-pre-wrap">{step.modelB.content || JSON.stringify(step.modelB)}</div>
                         </div>
                    </div>
                ) : step.critiqueA ? (
                    <div className="grid gap-4">
                         <div className="bg-white/5 p-5 rounded-xl border border-white/5">
                            <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Critique (Architect)</div>
                            <div className="text-[13px] font-mono text-zinc-400 leading-relaxed">{step.critiqueA}</div>
                         </div>
                         <div className="bg-white/5 p-5 rounded-xl border border-white/5">
                            <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Critique (Auditor)</div>
                            <div className="text-[13px] font-mono text-zinc-400 leading-relaxed">{step.critiqueB}</div>
                         </div>
                    </div>
                ) : (
                    <div className="p-5 bg-white/5 rounded-2xl text-[13px] font-mono text-zinc-400 border border-white/5 leading-relaxed shadow-inner">
                        {step.output || JSON.stringify(step)}
                    </div>
                )}
              </div>
            ))}
          </div>
        </aside>
      )}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}