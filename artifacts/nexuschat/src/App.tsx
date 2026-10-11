import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react';
import { Link, Route, Switch, useLocation, useParams } from 'wouter';
import {
  ArrowLeft, ArrowRight, CheckCheck, Eye, EyeOff, LockKeyhole,
  Mail, MessageCircle, Plus, Search, Send, ShieldCheck, Sparkles,
} from 'lucide-react';
import NotFound from '@/pages/not-found';

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
      const now = new Date();
      const timestamp = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      const message = { id: `local-${Date.now()}`, senderId: me.id, text, timestamp };
      return { ...conversation, messages: [...conversation.messages, message], lastMessage: text, updatedAt: timestamp, unreadCount: 0 };
    }));
  }, []);
  const markRead = useCallback((id: string) => setConversations(current => {
    if (!current.some(c => c.id === id && c.unreadCount > 0)) return current;
    return current.map(c => c.id === id ? { ...c, unreadCount: 0 } : c);
  }), []);
  const value = useMemo(() => ({ conversations, sendMessage, markRead }), [conversations]);
  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

function Brand({ onClick }: { onClick?: () => void }) {
  return <Link href="/" className="brand-lockup" onClick={onClick} data-testid="link-brand-home">
    <span className="brand-mark"><MessageCircle size={19} strokeWidth={2.5} /></span>
    <span className="brand-name">NexusChat</span>
  </Link>;
}

function Avatar({ user, small = false }: { user: User; small?: boolean }) {
  return <div className={`avatar${small ? ' small' : ''}`} style={{ background: user.tint }} data-testid={`avatar-${user.id}`} aria-label={`${user.name} avatar`}>
    {user.avatar}{user.online && <span className="avatar-dot online" />}
  </div>;
}

function ChatList({ activeId }: { activeId?: string }) {
  const { conversations } = useChatData();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const searchRef = useRef<HTMLInputElement>(null);
  const visible = conversations.filter(c => c.participant.name.toLowerCase().includes(query.trim().toLowerCase()) && (filter === 'all' || c.unreadCount > 0));
  return <aside className={`conversation-sidebar${activeId ? ' mobile-hidden' : ''}`} data-testid="chat-sidebar">
    <div className="brand-row"><Brand /><button className="icon-button" aria-label="Find someone to chat with" data-testid="button-new-conversation" onClick={() => { setFilter('all'); setQuery(''); searchRef.current?.focus(); }}><Plus size={18} /></button></div>
    <div className="sidebar-intro"><span className="eyebrow">Your people, right here</span><h1>Messages<span style={{ color: '#d9795f' }}>.</span></h1></div>
    <div className="search-wrap"><Search size={16} /><input ref={searchRef} className="search-input" type="search" placeholder="Find a conversation" value={query} onChange={e => setQuery(e.target.value)} aria-label="Find a conversation" data-testid="input-search-conversations" /></div>
    <div className="filter-row" role="group" aria-label="Filter conversations">
      <button className={`filter-chip${filter === 'all' ? ' active' : ''}`} onClick={() => setFilter('all')} data-testid="filter-all">All chats</button>
      <button className={`filter-chip${filter === 'unread' ? ' active' : ''}`} onClick={() => setFilter('unread')} data-testid="filter-unread">Unread {conversations.some(c => c.unreadCount > 0) && <span>· {conversations.reduce((n,c) => n + c.unreadCount,0)}</span>}</button>
    </div>
    <div className="list-label"><span>{filter === 'unread' ? 'Unread messages' : 'Recent'}</span><span>{visible.length}</span></div>
    <div className="conversation-list" data-testid="list-conversations">
      {visible.map(conversation => <Link key={conversation.id} href={`/chat/${conversation.id}`} className={`conversation-row${activeId === conversation.id ? ' selected' : ''}`} data-testid={`conversation-${conversation.id}`}>
        <Avatar user={conversation.participant} small />
        <div className="row-content">
          <div className="row-top"><span className="row-name" data-testid={`text-participant-${conversation.id}`}>{conversation.participant.name}</span><span className="row-time">{conversation.updatedAt}</span></div>
          <div className="row-bottom"><span className="row-preview">{conversation.lastMessage}</span>{conversation.unreadCount > 0 && <span className="unread-pill" data-testid={`unread-${conversation.id}`}>{conversation.unreadCount}</span>}</div>
        </div>
      </Link>)}
      {visible.length === 0 && <div className="empty-search" data-testid="empty-conversations">No conversations match that. Try a different name or switch to all chats.</div>}
    </div>
    <div className="sidebar-bottom"><div className="self-avatar" data-testid="avatar-me">AM</div><div className="self-meta"><div className="self-name" data-testid="text-current-user">{me.name}</div><div className="self-status">Here for the good chats</div></div></div>
    <div className="sidebar-auth"><Link href="/login" data-testid="link-login-sidebar">Log in</Link><Link href="/signup" data-testid="link-signup-sidebar">Create account</Link></div>
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
      <div className="chat-person"><div className="chat-person-name" data-testid="text-chat-participant">{conversation.participant.name}</div><div className="chat-person-status"><span className={`status-dot${conversation.participant.online ? '' : ''}`} style={{ background: conversation.participant.online ? '#53ae78' : '#b0b8b2' }} />{conversation.participant.online ? 'Online now' : 'Around recently'}</div></div>
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
      <form className="composer" onSubmit={e => { e.preventDefault(); submit(); }}>
        <textarea value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={handleKeyDown} placeholder={`Message ${conversation.participant.name.split(' ')[0]}...`} aria-label="Write a message" data-testid="input-message" rows={1} />
        <button type="submit" className="send-button" disabled={!draft.trim()} aria-label="Send message" data-testid="button-send-message"><Send size={17} /></button>
      </form>
      <div className="composer-hint"><span>Enter to send · Shift + Enter for a new line</span><span>Just between you two</span></div>
    </div>
  </section>;
}

function ChatLayout({ activeId }: { activeId?: string }) {
  const [, setLocation] = useLocation();
  const { conversations } = useChatData();
  const conversation = conversations.find(c => c.id === activeId);
  return <main className="app-shell"><div className="chat-frame">
    <ChatList activeId={activeId} />
    <div className={`main-panel${!activeId ? ' mobile-hidden' : ''}`}>
      {conversation ? <ChatConversation conversation={conversation} onBack={() => setLocation('/')} /> : activeId ? <div className="welcome-panel"><div className="empty-search">That conversation is not here. <Link href="/">Back to your messages</Link></div></div> : <WelcomePanel />}
    </div>
  </div></main>;
}

function HomePage() { return <ChatLayout />; }
function ConversationPage() {
  const params = useParams<{ id: string }>();
  return <ChatLayout activeId={params.id} />;
}

function AuthStory({ signup }: { signup: boolean }) {
  return <section className="auth-story">
    <Brand />
    <div className="story-copy"><span className="eyebrow">{signup ? 'A softer kind of social' : 'Good to have you back'}</span><h1>{signup ? <>Make room<br />for your<br />people.</> : <>The best<br />part of the<br />day is here.</>}</h1><p>{signup ? 'A little place to keep all the little moments that make a friendship yours.' : 'Your people, your conversations, right where you left them.'}</p></div>
    <div className="story-quote">{signup ? '“The check-ins, the plans, the nothing-in-particulars. All in one good place.”' : '“It feels like walking into the kitchen where your friends are already talking.”'}<strong>{signup ? '— The NexusChat feeling' : '— A little note from us'}</strong></div>
  </section>;
}

function AuthPage({ signup }: { signup: boolean }) {
  const [showPassword, setShowPassword] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const title = signup ? 'Create your space' : 'Welcome back';
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(signup
      ? `Thanks${name.trim() ? `, ${name.trim()}` : ''}. This is a demo form — no account has been created and your details have not been saved.`
      : 'This is a demo sign-in screen. No credentials were sent or saved.');
  };
  return <main className="auth-page" data-testid={`page-${signup ? 'signup' : 'login'}`}>
    <AuthStory signup={signup} />
    <section className="auth-main"><div className="auth-box">
      <div className="mobile-brand"><Brand /></div>
      <span className="eyebrow">{signup ? 'Start with a hello' : 'Your conversations are waiting'}</span>
      <h2 data-testid="text-auth-title">{title}</h2>
      <p className="auth-lead">{signup ? 'A few details and you are ready to feel a little closer.' : 'Come on in. Pick up right where you left off.'}</p>
      <div className="auth-notice"><ShieldCheck size={15} /><span>Demo experience only. Your details stay on this page and are never sent or stored.</span></div>
      <form className="auth-form" onSubmit={submit} data-testid={`form-${signup ? 'signup' : 'login'}`}>
        {signup && <div className="field"><label htmlFor="full-name">Your name</label><div className="field-input-wrap"><Sparkles size={15} /><input id="full-name" className="field-input" value={name} onChange={e => setName(e.target.value)} placeholder="How friends know you" autoComplete="name" required data-testid="input-name" /></div></div>}
        <div className="field"><label htmlFor="email">Email address</label><div className="field-input-wrap"><Mail size={15} /><input id="email" type="email" className="field-input" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required data-testid="input-email" /></div></div>
        <div className="field"><label htmlFor="password">Password</label><div className="field-input-wrap"><LockKeyhole size={15} /><input id="password" type={showPassword ? 'text' : 'password'} className="field-input password-input" value={password} onChange={e => setPassword(e.target.value)} placeholder={signup ? 'At least 8 characters' : 'Enter your password'} autoComplete={signup ? 'new-password' : 'current-password'} minLength={signup ? 8 : undefined} required data-testid="input-password" /><button className="password-toggle" type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'} data-testid="button-toggle-password">{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></div>
        <button className="auth-submit" type="submit" data-testid={`button-submit-${signup ? 'signup' : 'login'}`}>{signup ? 'Continue' : 'Log in'} <ArrowRight size={16} /></button>
      </form>
      {feedback && <div className="auth-feedback" role="status" data-testid="status-auth-feedback">{feedback}</div>}
      <p className="auth-switch">{signup ? 'Already have a space here?' : 'New to NexusChat?'}{' '}<Link href={signup ? '/login' : '/signup'} data-testid={`link-switch-${signup ? 'login' : 'signup'}`}>{signup ? 'Log in instead' : 'Create an account'}</Link></p>
      <div className="auth-footnote">By continuing, you are exploring a local interface demo. No authentication or account creation takes place.</div>
    </div></section>
  </main>;
}

function Router() {
  return <ChatProvider><Switch>
    <Route path="/" component={HomePage} />
    <Route path="/login"><AuthPage signup={false} /></Route>
    <Route path="/signup"><AuthPage signup /></Route>
    <Route path="/chat/:id" component={ConversationPage} />
    <Route component={NotFound} />
  </Switch></ChatProvider>;
}

function App() { return <Router />; }
export default App;
