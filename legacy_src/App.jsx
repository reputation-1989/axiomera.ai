import React, { useState } from 'react';
import { useChatStore } from './state/chatStore';
import { MessageSquare, Plus, ShieldCheck, Terminal, Send, Zap } from 'lucide-react';

export default function App() {
  const { conversations, activeId, setActiveId, newConversation, addMessage, isLoading, setLoading } = useChatStore();
  const [input, setInput] = useState("");
  const [selectedTranscript, setSelectedTranscript] = useState(null);

  const activeConvo = conversations.find(c => c.id === activeId) || conversations[0];

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const userPrompt = input;
    setInput("");
    addMessage("user", userPrompt);
    setLoading(true);

    try {
      const response = await fetch("http://localhost:3000/api/debate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: userPrompt }),
      });
      const data = await response.json();
      addMessage("assistant", data.finalAnswer, data.transcript || [], data.metadata || {});
    } catch (error) {
      addMessage("assistant", "The debate failed to initialize. Ensure backend is running on port 3000.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full bg-background text-white overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border flex flex-col bg-black/40">
        <div className="p-5 border-b border-border flex items-center gap-3">
          <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(37,99,235,0.4)]">
            <Zap size={18} fill="white" />
          </div>
          <span className="font-bold text-lg tracking-tight">room.ai</span>
        </div>
        
        <button onClick={newConversation} className="mx-4 mt-6 mb-2 flex items-center justify-center gap-2 p-2.5 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all text-sm font-medium">
          <Plus size={16} /> New Chat
        </button>

        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {conversations.map(c => (
            <button key={c.id} onClick={() => setActiveId(c.id)} className={`w-full text-left p-3 rounded-xl text-sm truncate transition-all ${c.id === activeId ? 'bg-accent/10 border border-accent/20 text-accent' : 'text-gray-400 hover:bg-white/5'}`}>
              {c.title}
            </button>
          ))}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#050505]">
        <header className="h-16 border-b border-border flex items-center px-8 justify-between bg-black/20 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">System Ready</h2>
          </div>
          <div className="flex items-center gap-4">
             <span className="text-[10px] font-bold text-accent border border-accent/30 px-2 py-1 rounded tracking-widest">VERIFIED ENGINE</span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 space-y-10">
          {activeConvo.messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] rounded-2xl p-5 shadow-sm ${msg.role === 'user' ? 'bg-accent text-white' : 'bg-card border border-border'}`}>
                <div className="text-[15px] leading-relaxed whitespace-pre-wrap">{msg.content}</div>
                {msg.role === 'assistant' && msg.transcript?.length > 0 && (
                  <button onClick={() => setSelectedTranscript(msg)} className="mt-5 pt-4 border-t border-white/5 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-accent hover:text-blue-300 transition-all">
                    <Terminal size={14} /> Open Debate Transcript
                  </button>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex items-center gap-3 text-gray-500 text-xs font-medium italic">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce" style={{animationDelay: '0ms'}} />
                <div className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce" style={{animationDelay: '150ms'}} />
                <div className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce" style={{animationDelay: '300ms'}} />
              </div>
              Multi-agent reasoning in progress...
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="p-8">
          <div className="max-w-4xl mx-auto relative">
            <textarea 
              value={input} 
              onChange={(e) => setInput(e.target.value)} 
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())} 
              placeholder="Deep search, verify, or debate a topic..." 
              className="w-full bg-card border border-border rounded-2xl p-5 pr-16 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all resize-none min-h-[64px] text-sm shadow-2xl shadow-black" 
            />
            <button onClick={handleSend} className="absolute right-4 bottom-4 p-2.5 bg-accent rounded-xl hover:scale-105 active:scale-95 transition-all text-white shadow-lg shadow-accent/20">
              <Send size={20} />
            </button>
          </div>
          <p className="text-center text-[10px] text-gray-600 mt-4 tracking-tight uppercase">Room AI is verified by multiple logical engines.</p>
        </div>
      </main>

      {/* Right Drawer (Transcript) */}
      {selectedTranscript && (
        <aside className="w-[450px] border-l border-border bg-[#080808] flex flex-col animate-in slide-in-from-right duration-300">
          <div className="p-6 border-b border-border flex justify-between items-center bg-black/40">
            <h3 className="font-black text-[11px] uppercase tracking-[0.3em] text-accent">Process Inspector</h3>
            <button onClick={() => setSelectedTranscript(null)} className="text-gray-500 hover:text-white transition-all text-xl font-light">✕</button>
          </div>
          <div className="p-6 overflow-y-auto space-y-6">
            {selectedTranscript.transcript.map((step, idx) => (
              <div key={idx} className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="px-2 py-0.5 bg-accent/20 text-accent text-[9px] font-bold rounded uppercase tracking-widest">{step.phase}</div>
                  <div className="flex-1 h-px bg-white/5" />
                </div>
                <div className="text-[12px] text-gray-400 font-mono leading-relaxed bg-white/5 p-4 rounded-xl border border-white/5">
                  {typeof step.output === 'string' ? step.output : JSON.stringify(step.output || step, null, 2)}
                </div>
              </div>
            ))}
          </div>
        </aside>
      )}
    </div>
  );
}
