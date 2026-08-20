import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Sparkles, Wrench, Trash2, ThumbsUp, ThumbsDown } from 'lucide-react';
import api from '../api/axios';

// Floating "NSS Saathi" assistant, mounted once in Layout so it's available
// from every authenticated page. Backed by /api/chatbot — see
// server/controllers/chatbotController.js. Conversation history persists in
// Mongo per-user, and when a tool-capable provider (Groq/OpenAI) is
// configured, the bot can look up live data via the agent loop in
// utils/llmClient.js rather than just reciting FAQs.
export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [greeting, setGreeting] = useState(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, open, loading]);

  // Load history + a fresh proactive greeting the first time the widget opens.
  useEffect(() => {
    if (!open || hydrated) return;
    setHydrated(true);
    Promise.all([api.get('/chatbot/history'), api.get('/chatbot/greeting')]).then(([histRes, greetRes]) => {
      setMessages(
        histRes.data.messages.map((m) => ({
          id: m._id,
          role: m.role,
          text: m.content,
          toolsUsed: m.toolsUsed,
          feedback: m.feedback,
        }))
      );
      setGreeting(greetRes.data.greeting);
    });
  }, [open, hydrated]);

  const send = async (e) => {
    e.preventDefault();
    const question = input.trim();
    if (!question) return;
    setMessages((m) => [...m, { role: 'user', text: question }]);
    setInput('');
    setLoading(true);
    try {
      const { data } = await api.post('/chatbot/ask', { question });
      setMessages((m) => [
        ...m,
        { id: data.messageId, role: 'assistant', text: data.answer, source: data.source, toolsUsed: data.toolsUsed, feedback: null },
      ]);
    } catch {
      setMessages((m) => [...m, { role: 'assistant', text: "Sorry, I couldn't reach the assistant. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  const rate = async (messageId, rating) => {
    if (!messageId) return;
    setMessages((m) => m.map((msg) => (msg.id === messageId ? { ...msg, feedback: rating } : msg)));
    try {
      await api.post(`/chatbot/messages/${messageId}/feedback`, { rating });
    } catch {
      // Non-critical — feedback failing silently shouldn't interrupt the chat.
    }
  };

  const clearChat = async () => {
    await api.delete('/chatbot/history');
    setMessages([]);
  };

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 bg-primary-600 hover:bg-primary-700 text-white rounded-full w-12 h-12 sm:w-14 sm:h-14 shadow-soft flex items-center justify-center transition-transform hover:scale-105"
        aria-label="Open NSS Saathi chatbot"
      >
        {open ? <X size={20} /> : <MessageCircle size={20} />}
      </button>

      {open && (
        <div className="fixed bottom-20 right-4 left-4 sm:left-auto sm:bottom-24 sm:right-6 z-40 sm:w-96 h-[70vh] max-h-[30rem] bg-white rounded-2xl shadow-soft border border-primary-100 flex flex-col overflow-hidden">
          <div className="bg-primary-600 text-white px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={18} />
              <div>
                <p className="font-semibold text-sm leading-none">NSS Saathi</p>
                <p className="text-[11px] text-primary-100 mt-0.5">Your NSS VAC assistant</p>
              </div>
            </div>
            <button onClick={clearChat} title="Clear conversation" className="text-primary-100 hover:text-white p-1">
              <Trash2 size={15} />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2">
            {messages.length === 0 && greeting && (
              <div className="max-w-[90%] text-sm px-3 py-2 rounded-2xl bg-primary-50 text-ink rounded-bl-sm">
                {greeting}
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className="max-w-[90%]" style={{ marginLeft: m.role === 'user' ? 'auto' : 0 }}>
                <div
                  className={`text-sm px-3 py-2 rounded-2xl ${
                    m.role === 'user' ? 'bg-primary-600 text-white rounded-br-sm' : 'bg-primary-50 text-ink rounded-bl-sm'
                  }`}
                >
                  {m.text}
                </div>

                {m.role === 'assistant' && (
                  <div className="flex items-center gap-2 mt-1 px-1">
                    {m.toolsUsed?.length > 0 && (
                      <p className="text-[10px] text-ink/40 flex items-center gap-1">
                        <Wrench size={10} /> checked {m.toolsUsed.join(', ').replace(/_/g, ' ')}
                      </p>
                    )}
                    {m.id && (
                      <div className="flex items-center gap-1 ml-auto">
                        <button
                          onClick={() => rate(m.id, 'up')}
                          className={`p-0.5 rounded ${m.feedback === 'up' ? 'text-green-600' : 'text-ink/25 hover:text-ink/50'}`}
                          aria-label="Helpful"
                        >
                          <ThumbsUp size={12} />
                        </button>
                        <button
                          onClick={() => rate(m.id, 'down')}
                          className={`p-0.5 rounded ${m.feedback === 'down' ? 'text-red-500' : 'text-ink/25 hover:text-ink/50'}`}
                          aria-label="Not helpful"
                        >
                          <ThumbsDown size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            {loading && <div className="text-xs text-ink/40 px-2">NSS Saathi is thinking…</div>}
          </div>

          <form onSubmit={send} className="p-2 border-t border-primary-100 flex gap-2">
            <input
              className="input flex-1 !py-1.5 text-sm"
              placeholder="Ask about hours, deadlines…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <button type="submit" className="btn-primary !px-3" disabled={loading}>
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}