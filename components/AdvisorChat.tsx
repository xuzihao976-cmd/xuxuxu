
import React, { useState, useRef, useEffect } from 'react';
import { generateAdvisorResponse } from '../services/geminiService';

interface Message {
  id: string;
  role: 'user' | 'advisor';
  text: string;
}

interface AdvisorChatProps {
  isOpen: boolean;
  onClose: () => void;
}

const AdvisorChat: React.FC<AdvisorChatProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([
    { id: 'init', role: 'advisor', text: '指挥官，我是战区参谋部历史顾问。关于武器、战术或敌情，请随时询问。' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    setInput('');
    setIsLoading(true);

    // Add User Message
    const newMsg: Message = { id: Date.now().toString(), role: 'user', text: userText };
    const updatedMessages = [...messages, newMsg];
    setMessages(updatedMessages);

    // Prepare history for API (exclude init message if needed, or keep it)
    const apiHistory = updatedMessages
        .filter(m => m.id !== 'init')
        .map(m => ({ role: m.role === 'user' ? 'user' : 'model', text: m.text }));

    try {
        const responseText = await generateAdvisorResponse(apiHistory, userText);
        setMessages(prev => [...prev, { id: Date.now().toString() + '_adv', role: 'advisor', text: responseText }]);
    } catch (err) {
        setMessages(prev => [...prev, { id: Date.now().toString() + '_err', role: 'advisor', text: '（信号中断）' }]);
    } finally {
        setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
        <div className="bg-[#1a1a1a] w-full max-w-md h-[500px] border border-neutral-600 rounded-sm shadow-2xl flex flex-col relative font-mono">
            {/* Header */}
            <div className="bg-neutral-800 p-3 border-b border-neutral-700 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    <h3 className="text-neutral-200 font-bold tracking-widest text-sm">战地顾问 / 历史档案</h3>
                </div>
                <button onClick={onClose} className="text-neutral-400 hover:text-white transition-colors">
                    ✕
                </button>
            </div>

            {/* Chat Area */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#111]">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] text-xs sm:text-sm p-2 rounded leading-relaxed border ${
                            msg.role === 'user' 
                                ? 'bg-neutral-800 text-neutral-300 border-neutral-700' 
                                : 'bg-[#0a200a] text-green-100/90 border-green-900/50'
                        }`}>
                            {msg.role === 'advisor' && <div className="text-[9px] text-green-700/70 mb-1 font-bold">参谋部:</div>}
                            {msg.text}
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-[#0a200a] border border-green-900/50 p-2 rounded text-xs text-green-500 animate-pulse">
                            正在查阅档案...
                        </div>
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div className="p-3 bg-neutral-800 border-t border-neutral-700">
                <form onSubmit={handleSend} className="flex gap-2">
                    <input 
                        type="text" 
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="询问关于武器、历史或战术..."
                        className="flex-1 bg-black text-white text-sm px-3 py-2 border border-neutral-600 focus:border-neutral-400 outline-none rounded-sm placeholder-neutral-600"
                    />
                    <button 
                        type="submit" 
                        disabled={isLoading}
                        className="bg-neutral-700 hover:bg-neutral-600 text-neutral-200 px-4 py-2 text-xs font-bold border border-neutral-600 rounded-sm transition-colors disabled:opacity-50"
                    >
                        查询
                    </button>
                </form>
            </div>
        </div>
    </div>
  );
};

export default AdvisorChat;
