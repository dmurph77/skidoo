import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';

// ─────────────────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────────────────
function timeAgo(date) {
  const diff = (Date.now() - new Date(date)) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
const initials = (name) =>
  name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';

// ─────────────────────────────────────────────────────────────────────────────
// Render message text — highlight @mentions
// ─────────────────────────────────────────────────────────────────────────────
function MsgText({ text, mentions = [] }) {
  const mentionNames = new Set(
    mentions.map(m => (m.displayName || '').toLowerCase().replace(/\s+/g, ''))
  );
  const parts = text.split(/(@\S+)/g);
  return (
    <span>
      {parts.map((part, i) => {
        if (part.startsWith('@')) {
          const slug = part.slice(1).toLowerCase();
          const hit = [...mentionNames].some(n => n === slug || slug.startsWith(n) || n.startsWith(slug));
          if (hit) return (
            <span key={i} style={{
              color: 'var(--amber-pencil)', fontWeight: 700,
              background: 'rgba(245,166,35,0.13)', borderRadius: 3, padding: '0 3px',
            }}>{part}</span>
          );
        }
        return part;
      })}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// @mention autocomplete dropdown
// ─────────────────────────────────────────────────────────────────────────────
function MentionDropdown({ query, members, onSelect }) {
  const filtered = members
    .filter(m => m.displayName.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 6);
  if (!filtered.length) return null;
  return (
    <div style={{
      position: 'absolute', bottom: '100%', left: 0, right: 0, zIndex: 100,
      background: 'var(--card)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius)', marginBottom: 4,
      boxShadow: '0 -4px 20px rgba(0,0,0,0.25)',
    }}>
      {filtered.map(m => (
        <div key={m._id}
          onMouseDown={e => { e.preventDefault(); onSelect(m); }}
          style={{
            padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
            fontFamily: 'var(--font-scoreboard)', fontSize: 13, letterSpacing: 0.5,
            borderBottom: '1px solid var(--rule-dark)',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--elevated)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <div style={{
            width: 26, height: 26, borderRadius: '50%',
            background: 'rgba(245,166,35,0.2)', color: 'var(--amber-pencil)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700, flexShrink: 0,
          }}>{initials(m.displayName)}</div>
          <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{m.displayName}</span>
          <span style={{ color: 'var(--green-text)' }}>@{m.username}</span>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// System message pill
// ─────────────────────────────────────────────────────────────────────────────
function SystemPill({ msg }) {
  return (
    <div style={{ textAlign: 'center', padding: '6px 12px', margin: '4px 0' }}>
      <div style={{
        display: 'inline-block', background: 'var(--elevated)',
        border: '1px solid var(--border)', borderRadius: 20,
        padding: '5px 16px', maxWidth: '90%',
        fontFamily: 'var(--font-scoreboard)', fontSize: 12,
        color: 'var(--amber-pencil)', letterSpacing: 0.5, lineHeight: 1.5,
      }}>
        {msg.message}
      </div>
      <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
        {timeAgo(msg.createdAt)}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Single message bubble
// ─────────────────────────────────────────────────────────────────────────────
function Bubble({ m, isMe, user, onReply, onDelete, onLike, threadOpen, onToggleThread }) {
  return (
    <div style={{ display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row', gap: 8, marginBottom: 10, alignItems: 'flex-start' }}>
      {/* Avatar */}
      <div style={{
        width: 30, height: 30, borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
        background: isMe ? 'rgba(245,166,35,0.25)' : 'var(--elevated)',
        border: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 700,
        color: isMe ? 'var(--amber-pencil)' : 'var(--text-secondary)',
      }}>
        {m.user?.avatarUrl
          ? <img src={m.user.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : initials(m.user?.displayName)}
      </div>

      <div style={{ maxWidth: '76%', minWidth: 0 }}>
        {/* Name + time */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'baseline', marginBottom: 3, flexDirection: isMe ? 'row-reverse' : 'row' }}>
          <span style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 12, fontWeight: 700, letterSpacing: 0.5, color: isMe ? 'var(--amber-pencil)' : 'var(--green-pencil)' }}>
            {isMe ? 'YOU' : m.user?.displayName?.toUpperCase()}
          </span>
          <span style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 10, color: 'var(--text-muted)' }}>{timeAgo(m.createdAt)}</span>
        </div>

        {/* Bubble */}
        <div style={{
          background: isMe ? 'rgba(245,166,35,0.1)' : 'var(--elevated)',
          border: `1px solid ${isMe ? 'rgba(245,166,35,0.22)' : 'var(--border)'}`,
          borderRadius: isMe ? '12px 3px 12px 12px' : '3px 12px 12px 12px',
          padding: '8px 11px',
          fontFamily: 'var(--font-scoreboard)', fontSize: 14, color: 'var(--text-primary)',
          letterSpacing: 0.2, lineHeight: 1.55, wordBreak: 'break-word',
        }}>
          <MsgText text={m.message} mentions={m.mentions} />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, marginTop: 4, alignItems: 'center', flexDirection: isMe ? 'row-reverse' : 'row' }}>
          <button onClick={() => onLike(m._id)} style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: '1px 3px',
            display: 'flex', alignItems: 'center', gap: 3,
            color: m.likes?.includes(user?._id) ? 'var(--amber)' : 'var(--text-muted)',
            fontFamily: 'var(--font-scoreboard)', fontSize: 12,
          }}>
            {m.likes?.includes(user?._id) ? '♥' : '♡'}
            {m.likes?.length > 0 && <span>{m.likes.length}</span>}
          </button>

          <button onClick={() => onReply(m)} style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: '1px 3px',
            color: 'var(--text-muted)', fontFamily: 'var(--font-scoreboard)', fontSize: 11, letterSpacing: 0.5,
          }}>↩ REPLY</button>

          {m.replyCount > 0 && (
            <button onClick={() => onToggleThread(m._id)} style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: '1px 3px',
              color: threadOpen ? 'var(--amber-pencil)' : 'var(--green-text)',
              fontFamily: 'var(--font-scoreboard)', fontSize: 11, letterSpacing: 0.5,
            }}>
              {threadOpen ? '▲' : '▼'} {m.replyCount} {m.replyCount === 1 ? 'REPLY' : 'REPLIES'}
            </button>
          )}

          {(isMe || user?.isAdmin) && (
            <button onClick={() => onDelete(m._id)} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', fontSize: 12,
            }}>✕</button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Thread (replies) panel
// ─────────────────────────────────────────────────────────────────────────────
function Thread({ parentId, parentUser, user, members, onReplyPosted }) {
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [mentionQ, setMentionQ] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    api.get(`/chat/replies/${parentId}`)
      .then(r => setReplies(r.data.replies || []))
      .catch(() => {})
      .finally(() => setLoading(false));
    setTimeout(() => inputRef.current?.focus(), 80);
  }, [parentId]);

  const handleChange = (e) => {
    setInput(e.target.value);
    const m = e.target.value.match(/@(\w*)$/);
    setMentionQ(m ? m[1] : null);
  };

  const insertMention = (member) => {
    setInput(v => v.replace(/@\w*$/, `@${member.displayName.replace(/\s+/g, '')} `));
    setMentionQ(null);
    inputRef.current?.focus();
  };

  const send = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    setSending(true);
    const mentionIds = members
      .filter(m => input.includes(`@${m.displayName.replace(/\s+/g, '')}`))
      .map(m => m._id);
    try {
      const r = await api.post('/chat', { message: input.trim(), parentId, mentionIds });
      setReplies(prev => [...prev, r.data.message]);
      setInput('');
      onReplyPosted(parentId);
    } catch { } finally { setSending(false); }
  };

  return (
    <div style={{ marginLeft: 38, marginBottom: 8, paddingLeft: 12, borderLeft: '2px solid var(--border)' }}>
      {loading
        ? <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 11, color: 'var(--green-text)', padding: '6px 0' }}>LOADING...</div>
        : replies.map(r => {
            const isMine = r.user?._id === user?._id;
            return (
              <div key={r._id} style={{ display: 'flex', gap: 6, marginBottom: 7, alignItems: 'flex-start' }}>
                <div style={{
                  width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                  background: 'var(--elevated)', border: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 9, fontWeight: 700, color: 'var(--text-secondary)',
                }}>{initials(r.user?.displayName)}</div>
                <div>
                  <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 10, color: isMine ? 'var(--amber-pencil)' : 'var(--green-text)', marginBottom: 2 }}>
                    {isMine ? 'YOU' : r.user?.displayName?.toUpperCase()} · {timeAgo(r.createdAt)}
                  </div>
                  <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.5, wordBreak: 'break-word' }}>
                    <MsgText text={r.message} mentions={r.mentions} />
                  </div>
                </div>
              </div>
            );
          })
      }

      {/* Reply input */}
      <div style={{ position: 'relative', marginTop: 6 }}>
        {mentionQ !== null && <MentionDropdown query={mentionQ} members={members} onSelect={insertMention} />}
        <form onSubmit={send} style={{ display: 'flex', gap: 6 }}>
          <input ref={inputRef}
            className="form-input"
            style={{ flex: 1, fontSize: 12, margin: 0, padding: '5px 9px' }}
            placeholder={`REPLY TO ${parentUser?.toUpperCase()}...`}
            value={input} onChange={handleChange} maxLength={500} disabled={sending}
          />
          <button className="btn btn-primary btn-sm" type="submit"
            disabled={!input.trim() || sending} style={{ fontSize: 12, padding: '4px 10px' }}>
            {sending ? '...' : '↩'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Chat component
// ─────────────────────────────────────────────────────────────────────────────
export default function Chat({ onUnreadChange }) {
  const { user } = useAuth();
  const [messages,    setMessages]    = useState([]);
  const [input,       setInput]       = useState('');
  const [sending,     setSending]     = useState(false);
  const [members,     setMembers]     = useState([]);
  const [mentionQ,    setMentionQ]    = useState(null);
  const [replyingTo,  setReplyingTo]  = useState(null); // { _id, displayName }
  const [openThreads, setOpenThreads] = useState(new Set());
  const scrollRef  = useRef(null);
  const inputRef   = useRef(null);
  const pollRef    = useRef(null);

  // ── Load helpers ────────────────────────────────────────────────────────────
  const loadMessages = useCallback(async () => {
    try {
      const r = await api.get('/chat?limit=60');
      setMessages(r.data.messages || []);
    } catch { }
  }, []);

  const loadUnread = useCallback(async () => {
    try {
      const r = await api.get('/chat/unread');
      onUnreadChange?.(r.data.count || 0);
    } catch { }
  }, [onUnreadChange]);

  // ── On mount ────────────────────────────────────────────────────────────────
  useEffect(() => {
    loadMessages();
    api.get('/chat/members').then(r => setMembers(r.data.members || [])).catch(() => {});
    // Mark as seen immediately when chat page opens
    api.post('/chat/seen').catch(() => {});
    onUnreadChange?.(0);
    pollRef.current = setInterval(() => { loadMessages(); loadUnread(); }, 15000);
    return () => clearInterval(pollRef.current);
  }, []);

  // ── Auto-scroll ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  // ── Input handling ──────────────────────────────────────────────────────────
  const handleInput = (e) => {
    setInput(e.target.value);
    const m = e.target.value.match(/@(\w*)$/);
    setMentionQ(m ? m[1] : null);
  };

  const insertMention = (member) => {
    setInput(v => v.replace(/@\w*$/, `@${member.displayName.replace(/\s+/g, '')} `));
    setMentionQ(null);
    inputRef.current?.focus();
  };

  // ── Send ─────────────────────────────────────────────────────────────────────
  const send = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    setSending(true);
    const mentionIds = members
      .filter(m => input.includes(`@${m.displayName.replace(/\s+/g, '')}`))
      .map(m => m._id);
    try {
      if (replyingTo) {
        // Posting a reply from main input
        const r = await api.post('/chat', { message: input.trim(), parentId: replyingTo._id, mentionIds });
        setMessages(prev => prev.map(m =>
          m._id === replyingTo._id ? { ...m, replyCount: (m.replyCount || 0) + 1 } : m
        ));
        setOpenThreads(prev => new Set([...prev, replyingTo._id]));
        setReplyingTo(null);
      } else {
        const r = await api.post('/chat', { message: input.trim(), mentionIds });
        setMessages(prev => [...prev, { ...r.data.message, replyCount: 0 }]);
      }
      setInput('');
    } catch { } finally { setSending(false); }
  };

  // ── Actions ──────────────────────────────────────────────────────────────────
  const remove = async (id) => {
    await api.delete(`/chat/${id}`);
    setMessages(prev => prev.filter(m => m._id !== id));
  };

  const toggleLike = async (id) => {
    try {
      await api.post(`/chat/${id}/like`);
      setMessages(prev => prev.map(m => {
        if (m._id !== id) return m;
        const liked = m.likes?.includes(user?._id);
        return { ...m, likes: liked ? m.likes.filter(l => l !== user?._id) : [...(m.likes || []), user?._id] };
      }));
    } catch { }
  };

  const toggleThread = (id) => {
    setOpenThreads(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const startReply = (msg) => {
    setReplyingTo(msg);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const onReplyPosted = (parentId) => {
    setMessages(prev => prev.map(m =>
      m._id === parentId ? { ...m, replyCount: (m.replyCount || 0) + 1 } : m
    ));
    setOpenThreads(prev => new Set([...prev, parentId]));
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px', borderBottom: '1px solid var(--border)',
        background: 'var(--elevated)', flexShrink: 0,
      }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, letterSpacing: 2, color: 'var(--amber)' }}>
          LEAGUE CHAT
        </div>
        <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 11, color: 'var(--green-text)', letterSpacing: 2, marginTop: 2 }}>
          {members.length > 0 ? `${members.length} MEMBERS` : 'LIVE'} · TYPE @ TO MENTION
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', minHeight: 0 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px', fontFamily: 'var(--font-scoreboard)', fontSize: 13, color: 'var(--green-text)', letterSpacing: 2 }}>
            NO MESSAGES YET<br />BE THE FIRST TO TALK TRASH
          </div>
        )}
        {messages.map(m => (
          <div key={m._id}>
            {m.isSystem
              ? <SystemPill msg={m} />
              : <Bubble
                  m={m}
                  isMe={m.user?._id === user?._id}
                  user={user}
                  onReply={startReply}
                  onDelete={remove}
                  onLike={toggleLike}
                  threadOpen={openThreads.has(m._id)}
                  onToggleThread={toggleThread}
                />
            }
            {!m.isSystem && openThreads.has(m._id) && (
              <Thread
                parentId={m._id}
                parentUser={m.user?.displayName}
                user={user}
                members={members}
                onReplyPosted={onReplyPosted}
              />
            )}
          </div>
        ))}
      </div>

      {/* Reply banner */}
      {replyingTo && (
        <div style={{
          padding: '5px 14px', background: 'rgba(245,166,35,0.07)',
          borderTop: '1px solid rgba(245,166,35,0.2)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0,
        }}>
          <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 11, color: 'var(--amber-pencil)', letterSpacing: 0.5 }}>
            ↩ REPLYING TO <strong>{replyingTo.user?.displayName?.toUpperCase()}</strong>
          </div>
          <button onClick={() => setReplyingTo(null)}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14 }}>✕</button>
        </div>
      )}

      {/* Input */}
      <div style={{ padding: '10px 12px', borderTop: '1px solid var(--border)', flexShrink: 0, position: 'relative' }}>
        {mentionQ !== null && (
          <MentionDropdown query={mentionQ} members={members} onSelect={insertMention} />
        )}
        <form onSubmit={send} style={{ display: 'flex', gap: 8 }}>
          <input ref={inputRef}
            className="form-input"
            style={{ flex: 1, margin: 0, fontSize: 13 }}
            placeholder={
              !user?.emailVerified
                ? 'VERIFY EMAIL TO CHAT'
                : replyingTo
                ? `REPLY TO ${replyingTo.user?.displayName?.toUpperCase()}...`
                : 'SAY SOMETHING... (@ TO MENTION)'
            }
            value={input}
            onChange={handleInput}
            maxLength={1000}
            disabled={!user?.emailVerified || sending}
          />
          <button className="btn btn-primary btn-sm" type="submit"
            disabled={!input.trim() || sending || !user?.emailVerified}>
            {sending ? '...' : replyingTo ? '↩' : 'SEND'}
          </button>
        </form>
      </div>
    </div>
  );
}
