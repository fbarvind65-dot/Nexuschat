import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { ArrowLeft, CheckCheck, MessageCircle, Plus, Search, Send, Sparkles } from 'lucide-react';
import './_group.css';

type User = { id: string; name: string; avatar: string; online: boolean; tint: string };
type Message = { id: string; senderId: string; text: string; timestamp: string };
type Conversation = { id: string; participant: User; lastMessage: string; updatedAt: string; unreadCount: number; messages: Message[] };

const me: User = { id: 'me', name: 'Alex Morgan', avatar: 'AM', online: true, tint: '#f0d6c8' };
const initialConversations: Conversation[] = [
  {
    id: 'maya', participant: { id: 'maya', name: 'Maya Chen', avatar: 'MC', online: true, tint: '#f3d7c8' },
    lastMessage: 'Saturday market, then coffee?', updatedAt: '10:42 AM', unreadCount: 2,
    messages: [
      { id: 'm1', senderId: 'maya', text: 'I found that little bookshop you were telling me about!', timestamp: '10:18 AM' },
      { id: 'm2', senderId: 'me', text: 'The one with the tiny garden out back?', timestamp: '10:24 AM' },
      { id: 'm3', senderId: 'maya', text: 'Yes! It is even lovelier than I remembered.', timestamp: '10:27 AM' },
      { id: 'm4', senderId: 'maya', text: 'Saturday market, then coffee?', timestamp: '10:42 AM' },
    ],
  },
  {
    id: 'leo', participant: { id: 'leo', name: 'Leo Park', avatar: 'LP', online: true, tint: '#d7e5cf' },
    lastMessage: 'Sent you the playlist we talked about', updatedAt: '9:16 AM', unreadCount: 1,
    messages: [
      { id: 'l1', senderId: 'me', text: 'Need something good for the train ride tomorrow.', timestamp: '9:02 AM' },
      { id: 'l2', senderId: 'leo', text: 'Already on it. A little bit of everything, just for you.', timestamp: '9:16 AM' },
    ],
  },
  {
    id: 'sophie', participant: { id: 'sophie', name: 'Sophie Williams', avatar: 'SW', online: false, tint: '#e5d9f1' },
    lastMessage: 'That made my whole week, thank you', updatedAt: 'Yesterday', unreadCount: 0,
    messages: [
      { id: 's1', senderId: 'sophie', text: 'I got the new job!', timestamp: 'Yesterday' },
      { id: 's2', senderId: 'me', text: 'Sophie, that is such wonderful news. They are lucky to have you.', timestamp: 'Yesterday' },
      { id: 's3', senderId: 'sophie', text: 'That made my whole week, thank you', timestamp: 'Yesterday' },
    ],
  },
  {
    id: 'noah', participant: { id: 'noah', name: 'Noah Rivera', avatar: 'NR', online: false, tint: '#f0e2b9' },
    lastMessage: 'Voice note · 0:18', updatedAt: 'Yesterday', unreadCount: 0,
    messages: [{ id: 'n1', senderId: 'noah', text: 'I walked by the lake this morning and thought of our summer trip. We should plan another one soon.', timestamp: 'Yesterday' }],
  },
  {
    id: 'ella', participant: { id: 'ella', name: 'Ella Brooks', avatar: 'EB', online: true, tint: '#f2d1d9' },
    lastMessage: 'You: I will bring the good snacks', updatedAt: 'Tue', unreadCount: 0,
    messages: [
      { id: 'e1', senderId: 'ella', text: 'Movie night at mine this Friday?', timestamp: 'Tue' },
      { id: 'e2', senderId: 'me', text: 'I will bring the good snacks', timestamp: 'Tue' },
    ],
  },
  {
    id: 'group-weekenders', participant: { id: 'weekenders', name: 'The Weekenders', avatar: 'TW', online: false, tint: '#cce5df' },
    lastMessage: 'Priya: The cabin is booked!', updatedAt: 'Mon', unreadCount: 0,
    messages: [
      { id: 'g1', senderId: 'weekenders', text: 'Priya: The cabin is booked! Everyone clear for the 14th?', timestamp: 'Mon' },
    ],
  },
];

type ChatContextValue = { conversations: Conversation[]; sendMessage: (id: string, text: string) => void; markRead: (id: string) => void };
const ChatContext = createContext<ChatContextValue | null>(null);

function useChatData() {
  const value = useContext(ChatContext);
  if (!value) throw new Error('Chat context is unavailable');
  return value;
}

function ChatProvider({ children }: { children: ReactNode }) {
  const [conversations, setConversations] = useState(initialConversations);
  const sendMessage = useCallback((id: string, text: string) => {
    setConversations(current => current.map(conversation => {
      if (conversation.id !== id) return conversation;
      const timestamp = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      const message = { id: `local-${Date.now()}`, senderId: me.id, text, timestamp };
      return { ...conversation, messages: [...conversation.messages, message], lastMessage: text, updatedAt: timestamp, unreadCount: 0 };
    }));
  }, []);
  const markRead = useCallback((id: string) => setConversations(current => {
    if (!current.some(c => c.id === id && c.unreadCount > 0)) return current;
    return current.map(c => c.id === id ? { ...c, unreadCount: 0 } : c);
  }), []);
  const value = useMemo(() => ({ conversations, sendMessage, markRead }), [conversations, sendMessage, markRead]);
  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

function Brand() {
  return <div className="brand-lockup" aria-label="NexusChat">
    <span className="brand-mark"><MessageCircle size={19} strokeWidth={2.5} /></span>
    <span className="brand-name">NexusChat</span>
  </div>;
}

function Avatar({ user, small = false }: { user: User; small?: boolean }) {
  return <div className={`avatar${small ? ' small' : ''}`} style={{ background: user.tint }} data-testid={`avatar-${user.id}`} aria-label={`${user.name} avatar`}>
    {user.avatar}{user.online && <span className="avatar-dot online" />}
  </div>;
}

function ChatList({ activeId, onOpen }: { activeId?: string; onOpen: (id: string) => void }) {
  const { conversations } = useChatData();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  
const [updateDraft, setUpdateDraft] = useState("");
const [updates, setUpdates] = useState<
  { id: string; text: string; time: string }[]
>([]);
  
  const searchRef = useRef<HTMLInputElement>(null);
  const visible = conversations.filter(c => c.participant.name.toLowerCase().includes(query.trim().toLowerCase()) && (filter === 'all' || c.unreadCount > 0));

  return <aside className={`conversation-sidebar${activeId ? ' mobile-hidden' : ''}`} data-testid="chat-sidebar">
    <div className="brand-row"><Brand /><button className="icon-button" aria-label="Find someone to chat with" data-testid="button-new-conversation" onClick={() => { setFilter('all'); setQuery(''); searchRef.current?.focus(); }}><Plus size={18} /></button></div>
    <div className="sidebar-intro"><span className="eyebrow">Your people, right here</span><h1>Messages<span style={{ color: '#d9795f' }}>.</span></h1></div>
    <div className="search-wrap"><Search size={16} /><input ref={searchRef} className="search-input" type="search" placeholder="Find a conversation" value={query} onChange={e => setQuery(e.target.value)} aria-label="Find a conversation" data-testid="input-search-conversations" /></div>
    <div className="filter-row" role="group" aria-label="Filter conversations">
      <button className={`filter-chip${filter === 'all' ? ' active' : ''}`} onClick={() => setFilter('all')} data-testid="filter-all">All chats</button>
      <button className={`filter-chip${filter === 'unread' ? ' active' : ''}`} onClick={() => setFilter('unread')} data-testid="filter-unread">Unread {conversations.some(c => c.unreadCount > 0) && <span>· {conversations.reduce((n, c) => n + c.unreadCount, 0)}</span>}</button>
    </div>
    <div className="list-label"><span>{filter === 'unread' ? 'Unread messages' : 'Recent'}</span><span>{visible.length}</span></div>
    <div className="conversation-list" data-testid="list-conversations">
      {visible.map(conversation => <button type="button" key={conversation.id} onClick={() => onOpen(conversation.id)} className={`conversation-row${activeId === conversation.id ? ' selected' : ''}`} data-testid={`conversation-${conversation.id}`}>
        <Avatar user={conversation.participant} small />
        <span className="row-content">
          <span className="row-top"><span className="row-name" data-testid={`text-participant-${conversation.id}`}>{conversation.participant.name}</span><span className="row-time">{conversation.updatedAt}</span></span>
          <span className="row-bottom"><span className="row-preview">{conversation.lastMessage}</span>{conversation.unreadCount > 0 && <span className="unread-pill" data-testid={`unread-${conversation.id}`}>{conversation.unreadCount}</span>}</span>
        </span>
      </button>)}
      {visible.length === 0 && <div className="empty-search" data-testid="empty-conversations">No conversations match that. Try a different name or switch to all chats.</div>}
    </div>
    <div className="sidebar-bottom"><div className="self-avatar" data-testid="avatar-me">AM</div><div className="self-meta"><div className="self-name" data-testid="text-current-user">{me.name}</div><div className="self-status">Here for the good chats</div></div></div>
    <div className="sidebar-auth"><a href="#login" onClick={event => event.preventDefault()} data-testid="link-login-sidebar">Log in</a><a href="#signup" onClick={event => event.preventDefault()} data-testid="link-signup-sidebar">Create account</a></div>
  </aside>;
}

function WelcomePanel() {
  return <div className="welcome-panel" data-testid="welcome-panel">
    <div className="welcome-card">
      <div className="welcome-art" aria-hidden="true"><div className="art-orbit" /><div className="art-bubble one"><span className="art-dots"><i /><i /><i /></span></div><div className="art-bubble two"><span className="art-dots second"><i /><i /><i /></span></div><div className="art-bubble three"><i /><i /></div></div>
      <span className="eyebrow">A little closer, every day</span>
      <h2>Good conversations<br />live here.</h2>
      <p>Pick someone from your list and pick up right where you left off. No noise, just your people.</p>
      <span className="welcome-note"><Sparkles size={14} /> Your space for the everyday moments</span>
    </div>
  </div>;
}

function ChatConversation({ conversation, onBack }: { conversation: Conversation; onBack: () => void }) {
  const { sendMessage, markRead } = useChatData();
  const [draft, setDraft] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { markRead(conversation.id); }, [conversation.id, markRead]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [conversation.messages.length, conversation.id]);
  const submit = () => {
    const text = draft.trim();
    if (!text) return;
    sendMessage(conversation.id, text);
    setDraft('');
  };
  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); submit(); }
  };

  return <section className="chat-view" data-testid={`chat-view-${conversation.id}`}>
    <header className="chat-header">
      <button className="icon-button back-button" onClick={onBack} aria-label="Back to conversations" data-testid="button-back-conversations"><ArrowLeft size={19} /></button>
      <Avatar user={conversation.participant} small />
      <div className="chat-person"><div className="chat-person-name" data-testid="text-chat-participant">{conversation.participant.name}</div><div className="chat-person-status"><span className="status-dot" style={{ background: conversation.participant.online ? '#53ae78' : '#b0b8b2' }} />{conversation.participant.online ? 'Online now' : 'Around recently'}</div></div>
    </header>
    <div className="messages-area" data-testid="messages-list">
      <div className="day-divider">Today</div>
      {conversation.messages.map((message, index) => {
        const mine = message.senderId === me.id;
        return <div key={message.id} className={`message-line${mine ? ' mine' : ''}`} data-testid={`message-${message.id}`}>
          {!mine && <div className="message-mini" style={{ background: conversation.participant.tint }}>{conversation.participant.avatar}</div>}
          <div className="message-stack"><div className="message-bubble">{message.text}</div><div className="message-time">{message.timestamp}{mine && index === conversation.messages.length - 1 && <CheckCheck size={12} style={{ verticalAlign: 'middle', marginLeft: 4, color: '#88bdab' }} />}</div></div>
        </div>;
      })}
      <div ref={endRef} />
    </div>
    <div className="composer-wrap">
      <form className="composer" onSubmit={event => { event.preventDefault(); submit(); }}>
        <textarea value={draft} onChange={event => setDraft(event.target.value)} onKeyDown={handleKeyDown} placeholder={`Message ${conversation.participant.name.split(' ')[0]}...`} aria-label="Write a message" data-testid="input-message" rows={1} />
        <button type="submit" className="send-button" disabled={!draft.trim()} aria-label="Send message" data-testid="button-send-message"><Send size={17} /></button>
      </form>
      <div className="composer-hint"><span>Enter to send · Shift + Enter for a new line</span><span>Just between you two</span></div>
    </div>
  </section>;
}

function ChatLayout() {
  const { conversations } = useChatData();
  const [activeId, setActiveId] = useState<string>();
  const conversation = conversations.find(c => c.id === activeId);
  return <main className="app-shell"><div className="chat-frame">
    <ChatList activeId={activeId} onOpen={setActiveId} />
    <div className={`main-panel${!activeId ? ' mobile-hidden' : ''}`}>
      {conversation ? <ChatConversation conversation={conversation} onBack={() => setActiveId(undefined)} /> : activeId ? <div className="welcome-panel"><div className="empty-search">That conversation is not here.</div></div> : <WelcomePanel />}
    </div>
  </div></main>;
}

export function Current() {
  return <div className="nexuschat-current"><ChatProvider><ChatLayout /></ChatProvider></div>;
}

export default Current;
