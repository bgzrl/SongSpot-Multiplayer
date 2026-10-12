import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, X, Smile, Flame, Sparkles } from 'lucide-react';
import { ChatMessage, LiveReaction } from '../types/game';

interface ChatAndReactionsProps {
  messages: ChatMessage[];
  reactions: LiveReaction[];
  onSendMessage: (text: string) => void;
  onSendReaction: (emoji: string) => void;
  currentUserId: string;
}

const EMOJIS = ['🔥', '🤯', '🎵', '👏', '😂', '💀', '❤️', '🎉'];

export const ChatAndReactions: React.FC<ChatAndReactionsProps> = ({
  messages,
  reactions,
  onSendMessage,
  onSendReaction,
  currentUserId,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    } else {
      if (messages.length > 0) {
        const lastMsg = messages[messages.length - 1];
        if (lastMsg.senderId !== currentUserId) {
          setUnreadCount(prev => prev + 1);
        }
      }
    }
  }, [messages, isOpen, currentUserId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  return (
    <>
      {/* Floating live emoji animations */}
      <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden">
        {reactions.map(r => (
          <div
            key={r.id}
            className="absolute bottom-16 animate-float-fade flex flex-col items-center"
            style={{
              left: `${15 + (Math.abs(hashString(r.id)) % 70)}%`,
              animationDuration: '2.8s',
            }}
          >
            <span className="text-4xl drop-shadow-lg transform hover:scale-125 transition-transform">
              {r.emoji}
            </span>
            <span className="text-[10px] font-bold bg-slate-900/90 text-white px-2 py-0.5 rounded-full border border-slate-700/60 shadow">
              {r.senderName}
            </span>
          </div>
        ))}
      </div>

      {/* Floating Action Bar (Bottom Right) */}
      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2">
        {/* Quick Emoji Reaction Buttons */}
        <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-800 p-1.5 rounded-2xl shadow-xl backdrop-blur-md">
          {EMOJIS.slice(0, 4).map(emoji => (
            <button
              key={emoji}
              onClick={() => onSendReaction(emoji)}
              type="button"
              className="w-9 h-9 flex items-center justify-center text-lg hover:bg-slate-800 rounded-xl transition-transform active:scale-125 cursor-pointer"
              title={`Envoyer ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>

        {/* Chat Toggle Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          type="button"
          className="relative w-12 h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center shadow-xl shadow-indigo-600/30 transition-transform active:scale-95 cursor-pointer"
          title="Ouvrir le chat du salon"
        >
          <MessageSquare className="w-5 h-5" />
          {unreadCount > 0 && !isOpen && (
            <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-md animate-bounce">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Chat Drawer */}
      {isOpen && (
        <div className="fixed bottom-20 right-4 z-50 w-80 sm:w-96 h-[440px] bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-2xl backdrop-blur-xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-200">
          {/* Header */}
          <div className="p-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-indigo-400" />
              <span className="font-bold text-sm text-white">Chat de la salle</span>
              <span className="text-[11px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full border border-slate-700">
                Live
              </span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages list */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5 text-xs">
            {messages.map(msg => {
              if (msg.isSystem) {
                return (
                  <div
                    key={msg.id}
                    className="text-center py-1 px-2.5 bg-slate-950/50 rounded-lg text-slate-400 text-[11px] border border-slate-800/80"
                  >
                    {msg.text}
                  </div>
                );
              }

              const isMe = msg.senderId === currentUserId;
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                >
                  <span
                    className="text-[10px] font-semibold mb-0.5 px-1"
                    style={{ color: msg.senderColor || '#94a3b8' }}
                  >
                    {isMe ? 'Moi' : msg.senderName}
                  </span>
                  <div
                    className={`max-w-[85%] rounded-2xl px-3 py-2 leading-relaxed ${
                      isMe
                        ? 'bg-indigo-600 text-white rounded-br-none'
                        : 'bg-slate-800 text-slate-200 rounded-bl-none border border-slate-700/50'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick extra emojis */}
          <div className="px-3 py-1.5 border-t border-slate-800/60 flex items-center justify-between bg-slate-950/20">
            {EMOJIS.map(em => (
              <button
                key={em}
                onClick={() => onSendReaction(em)}
                type="button"
                className="text-sm hover:scale-125 transition-transform"
              >
                {em}
              </button>
            ))}
          </div>

          {/* Chat input form */}
          <form onSubmit={handleSubmit} className="p-3 border-t border-slate-800 bg-slate-950/50 flex gap-2">
            <input
              type="text"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              placeholder="Écrivez un message..."
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl text-xs font-semibold flex items-center justify-center transition-all cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}
