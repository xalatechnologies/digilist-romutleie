
import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Sparkles } from 'lucide-react';
import { Card, Text, Button, Input, Stack } from './XalaUI';
import { chatWithAssistantStream } from '../services/geminiService';
import { ChatMessage, MessageRole } from '../types';

export const AIAssistant: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: MessageRole.ASSISTANT, content: "Hello! I'm the Digilist AI Assistant. How can I help you manage your floor today?", timestamp: new Date() }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = { role: MessageRole.USER, content: input, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    let assistantContent = "";
    
    // Create temporary message for streaming
    setMessages(prev => [...prev, { role: MessageRole.ASSISTANT, content: "", timestamp: new Date() }]);

    try {
      await chatWithAssistantStream(input, (chunk) => {
        assistantContent += chunk;
        setMessages(prev => {
          const newMsgs = [...prev];
          newMsgs[newMsgs.length - 1] = { 
            ...newMsgs[newMsgs.length - 1], 
            content: assistantContent 
          };
          return newMsgs;
        });
      });
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: MessageRole.ASSISTANT, content: "An error occurred connecting to neural network.", timestamp: new Date() }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="flex flex-col h-[600px] border-primary/20 shadow-xl overflow-hidden bg-card">
      <div className="p-5 border-b bg-primary/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground shadow-lg">
            <Bot size={22} />
          </div>
          <div>
            <Text weight="bold" size="base">Digilist Intelligence</Text>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              <Text size="xs" muted>Operational Support Active</Text>
            </div>
          </div>
        </div>
        <Sparkles className="text-primary/40 h-6 w-6" />
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/30">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === MessageRole.USER ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
            <div className={`flex gap-4 max-w-[85%] ${msg.role === MessageRole.USER ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`h-9 w-9 shrink-0 rounded-xl flex items-center justify-center shadow-sm ${msg.role === MessageRole.USER ? 'bg-primary' : 'bg-white border'}`}>
                {msg.role === MessageRole.USER ? <User size={16} className="text-primary-foreground" /> : <Bot size={16} className="text-primary" />}
              </div>
              <div className={`p-4 rounded-2xl text-base leading-relaxed shadow-sm ${msg.role === MessageRole.USER ? 'bg-primary text-primary-foreground rounded-tr-none' : 'bg-white text-foreground rounded-tl-none border border-slate-100'}`}>
                {msg.content || (msg.role === MessageRole.ASSISTANT && isLoading && i === messages.length - 1 ? <Loader2 size={16} className="animate-spin opacity-50" /> : msg.content)}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="p-5 border-t bg-white">
        <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-3">
          <Input 
            placeholder="Query operational status or room data..." 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 rounded-xl h-12 shadow-sm border-slate-200"
          />
          <Button size="icon" type="submit" disabled={isLoading || !input.trim()} className="h-12 w-12 rounded-xl shadow-lg">
            <Send size={20} />
          </Button>
        </form>
      </div>
    </Card>
  );
};
