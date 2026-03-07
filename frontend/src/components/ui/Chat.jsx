import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';

function timeAgo(date) {
  const diff = (Date.now() - new Date(date)) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function Chat() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);
  const pollRef = useRef(null);

  const load = async () => {
    try {
      const r = await api.get('/chat?limit=60');
      setMessages(r.data.messages || []);
    } catch (err) { /* silent */ }
  };

  useEffect(() => {
    load();
    pollRef.current = setInterval(load, 15000); // poll every 15s
    return () => clearInterval(pollRef.current);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    setSending(true);
    try {
      const r = await api.post('/chat', { message: input.trim() });
      setMessages(prev => [...prev, r.data.message]);
      setInput('');
    } catch (err) { /* silent */ } finally { setSending(false); }
  };

  const remove = async (id) => {
    await api.delete(`/chat/${id}`);
    setMessages(prev => prev.filter(m => m._id !== id));
  };

  const initials = (name) => name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';

  return (
    <div className="chat-wrap">
      <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', background: 'var(--elevated)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, letterSpacing: 2, color: 'var(--amber)' }}>LEAGUE CHAT</div>
        <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 9, color: 'var(--green-text)', letterSpacing: 2 }}>LIVE · REFRESHES EVERY 15s</div>
      </div>

      <div className="chat-messages">
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '20px', fontFamily: 'var(--font-scoreboard)', fontSize: 11, color: 'var(--green-text)', letterSpacing: 2 }}>
            NO MESSAGES YET — BE THE FIRST TO TALK TRASH
          </div>
        )}
        {messages.map(m => {
          const isMe = m.user?._id === user?._id;
          return (
            <div key={m._id} className="chat-message" style={{ flexDirection: isMe ? 'row-reverse' : 'row' }}>
              <div className="chat-avatar">
                {m.user?.avatarUrl
                  ? <img src={m.user.avatarUrl} alt={m.user.displayName} />
                  : initials(m.user?.displayName)}
              </div>
              <div className={`chat-bubble ${isMe ? 'mine' : ''}`}>
                {!isMe && <div className="chat-name">{m.user?.displayName?.toUpperCase()}</div>}
                <div className="chat-text">{m.message}</div>
                <div className="chat-time" style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', alignItems: 'center' }}>
                  {timeAgo(m.createdAt)}
                  {(isMe || user?.isAdmin) && (
                    <button
                      onClick={() => remove(m._id)}
                      style={{ background: 'none', border: 'none', color: 'var(--green-text)', fontSize: 10, cursor: 'pointer', padding: 0 }}
                      title="Delete"
                    >✕</button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={send} className="chat-input-row">
        <input
          className="form-input"
          style={{ flex: 1, margin: 0, fontSize: 13 }}
          placeholder={user?.emailVerified ? 'SAY SOMETHING...' : 'VERIFY EMAIL TO CHAT'}
          value={input}
          onChange={e => setInput(e.target.value)}
          maxLength={500}
          disabled={!user?.emailVerified || sending}
        />
        <button
          className="btn btn-primary btn-sm"
          type="submit"
          disabled={!input.trim() || sending || !user?.emailVerified}
        >
          {sending ? '...' : 'SEND'}
        </button>
      </form>
    </div>
  );
}
