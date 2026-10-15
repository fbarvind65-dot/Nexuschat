
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  onAuthStateChanged,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  type User,
} from "firebase/auth";

import { auth, db } from "./firebase";

import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
  orderBy,
} from "firebase/firestore";

import {
  ArrowLeft,
  CheckCheck,
  Copy,
  Forward,
  LogOut,
  MessageCircle,
  MoreVertical,
  Plus,
  Search,
  Send,
  Settings as SettingsIcon,
  Trash2,
  User as UserIcon,
  Phone,
  Video,
  X,
  Eye,
  EyeOff,
} from "lucide-react";
import Settings from "./Settings";

type Message = {
  id: string;
  text: string;
  sender: "me" | "other";
  time: string;
  forwarded?: boolean;
};

type Chat = {
  id: string;
  name: string;
  avatar: string;
  color: string;
  online: boolean;
  unread: number;
  messages: Message[];
};

const initialChats: Chat[] = [
  {
    id: "1",
    name: "NexusChat Team",
    avatar: "N",
    color: "#6c63ff",
    online: true,
    unread: 1,
    messages: [
      {
        id: "m1",
        text: "Welcome to NexusChat! 👋",
        sender: "other",
        time: "10:30",
      },
      {
        id: "m2",
        text: "Your chat interface is ready.",
        sender: "other",
        time: "10:31",
      },
    ],
  },
  {
    id: "2",
    name: "Friends Group",
    avatar: "F",
    color: "#e879a9",
    online: true,
    unread: 0,
    messages: [
      {
        id: "m3",
        text: "Hey everyone! 😊",
        sender: "other",
        time: "09:45",
      },
    ],
  },
  {
    id: "3",
    name: "Alex",
    avatar: "A",
    color: "#22a699",
    online: false,
    unread: 0,
    messages: [
      {
        id: "m4",
        text: "See you later!",
        sender: "other",
        time: "Yesterday",
      },
    ],
  },
];

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function currentTime() {
  return new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
const menuButtonStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  padding: "10px 12px",
  textAlign: "left",
  background: "transparent",
  border: "none",
  color: "white",
  cursor: "pointer",
};
const css = `
*{box-sizing:border-box}
body{margin:0;font-family:Inter,Arial,sans-serif;background:#0b1020;color:#eef0ff}
button,input{font:inherit}
button{cursor:pointer}
.app{height:100dvh;min-height:480px;display:flex;background:#0b1020;color:#eef0ff;overflow:hidden}
.sidebar{width:340px;flex-shrink:0;border-right:1px solid #242b42;display:flex;flex-direction:column;background:#11172a}
.brand{display:flex;align-items:center;gap:11px;padding:21px 18px;font-size:22px;font-weight:800}
.brandIcon{width:39px;height:39px;display:grid;place-items:center;background:linear-gradient(135deg,#8177ff,#5545df);border-radius:13px}
.brandAccent{color:#8e85ff}
.searchWrap{padding:0 15px 14px;position:relative}
.searchWrap svg{position:absolute;left:28px;top:13px;color:#8c94ad}
.search{width:100%;padding:12px 12px 12px 39px;background:#1a2239;color:white;border:1px solid #2b3450;border-radius:12px;outline:none}
.search:focus,.composer input:focus{border-color:#8278ff}
.filters{display:flex;gap:8px;padding:0 15px 14px}
.filter{border:1px solid #303954;color:#aeb6d1;background:transparent;border-radius:20px;padding:7px 13px;font-size:12px}
.filter.active{background:#6258e8;border-color:#6258e8;color:white}
.sectionLabel{padding:8px 18px;color:#808aa8;text-transform:uppercase;font-size:10px;letter-spacing:1.5px;font-weight:700}
.chatList{overflow-y:auto;flex:1}
.chatItem{width:100%;display:flex;gap:12px;align-items:center;padding:13px 15px;text-align:left;background:transparent;border:0;color:inherit;border-left:3px solid transparent}
.chatItem:hover{background:#1a2239}
.chatItem.selected{background:#202843;border-left-color:#8177ff}
.avatar{width:45px;height:45px;flex-shrink:0;border-radius:15px;display:grid;place-items:center;color:white;font-weight:800;font-size:18px}
.chatInfo{flex:1;min-width:0}
.chatTop{display:flex;justify-content:space-between;gap:6px;align-items:center}
.chatName{font-size:13px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.chatTime{font-size:10px;color:#8791ad}
.lastMessage{margin-top:6px;color:#929bb7;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.unread{background:#776af7;border-radius:20px;min-width:19px;height:19px;padding:0 5px;display:grid;place-items:center;font-size:10px}
.profile{border-top:1px solid #283049;padding:15px;display:flex;align-items:center;gap:10px}
.profileInfo{flex:1;min-width:0}
.profileName{font-size:12px;font-weight:700;overflow-wrap:anywhere}
.profileEmail{font-size:10px;color:#929bb7;margin-top:4px;overflow-wrap:anywhere}
.iconBtn{border:0;background:transparent;color:#aab3ce;border-radius:9px;padding:8px;display:inline-grid;place-items:center}
.iconBtn:hover{background:#2a3451;color:white}
.main{display:flex;flex-direction:column;flex:1;min-width:0}
.empty{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:20px}
.emptyIcon{width:80px;height:80px;border-radius:25px;background:#24264d;color:#9489ff;display:grid;place-items:center;margin-bottom:18px}
.empty h2{margin:0 0 9px;font-size:23px}
.empty p{color:#8f99b5;max-width:300px;line-height:1.6;font-size:13px}
.header{height:77px;display:flex;align-items:center;gap:12px;padding:0 20px;border-bottom:1px solid #242b42;background:#11172a}
.headerInfo{flex:1;min-width:0}
.headerName{font-size:14px;font-weight:750}
.onlineText{font-size:11px;color:#55d7a4;margin-top:5px}
.offlineText{font-size:11px;color:#8b94af;margin-top:5px}
.messages{flex:1;overflow-y:auto;padding:22px clamp(12px,4vw,48px);display:flex;flex-direction:column;gap:13px;background:radial-gradient(ellipse at top right,#151b36 0,transparent 48%)}
.day{text-align:center;margin:2px auto 8px;padding:7px 12px;background:#1b2340;border-radius:20px;font-size:10px;color:#aeb6d1}
.messageRow{display:flex;align-items:flex-end;gap:7px;max-width:85%}
.messageRow.mine{align-self:flex-end;flex-direction:row-reverse}
.bubble{padding:11px 13px;border:1px solid #2a3450;background:#1a2239;border-radius:15px 15px 15px 4px;min-width:70px;overflow-wrap:anywhere}
.mine .bubble{background:#5d52d9;border-color:#7166eb;border-radius:15px 15px 4px 15px}
.messageText{font-size:13px;line-height:1.55;white-space:pre-wrap}
.forwardedLabel{font-size:10px;color:#b8b0ff;margin-bottom:5px;display:flex;align-items:center;gap:5px}
.messageMeta{display:flex;justify-content:flex-end;align-items:center;gap:4px;margin-top:6px;font-size:9px;color:#b0b7d0}
.messageActions{display:flex;gap:1px;opacity:.8}
.messageActions .iconBtn{padding:5px}
.composerArea{padding:13px 18px 17px;border-top:1px solid #242b42;background:#11172a}
.composer{display:flex;align-items:center;gap:10px;background:#1a2239;border:1px solid #2b3450;border-radius:15px;padding:7px 8px 7px 14px}
.composer input{flex:1;min-width:0;background:transparent;border:1px solid transparent;color:white;outline:none;padding:8px;font-size:13px}
.sendBtn{width:42px;height:42px;display:grid;place-items:center;border:0;border-radius:12px;color:white;background:#6c60eb}
.sendBtn:hover{background:#8277ff}
.hint{font-size:10px;color:#707b99;text-align:center;margin-top:10px}
.menuWrap{position:relative}
.dropdown{position:absolute;z-index:5;right:0;top:42px;width:190px;background:#202943;border:1px solid #37425e;border-radius:12px;padding:6px;box-shadow:0 12px 35px #0006}
.dropdown button{width:100%;border:0;background:transparent;color:#e9ecff;text-align:left;padding:11px 9px;border-radius:8px;display:flex;align-items:center;gap:9px;font-size:12px}
.dropdown button:hover{background:#303a59}
.dropdown button.danger{color:#ff929c}
.modalBackdrop{position:fixed;inset:0;background:#050815bb;z-index:20;display:grid;place-items:center;padding:18px}
.modal{width:min(410px,100%);background:#151d32;border:1px solid #35405d;border-radius:18px;padding:22px;box-shadow:0 20px 60px #0008}
.modalHead{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:12px}
.modal h3{margin:0;font-size:17px}
.modal p{font-size:12px;color:#a5aec8;line-height:1.6}
.modalList{max-height:230px;overflow:auto}
.modalChat{width:100%;display:flex;align-items:center;gap:10px;text-align:left;color:white;background:#202943;border:1px solid #36415f;border-radius:10px;padding:10px;margin:7px 0}
.primaryBtn{width:100%;padding:12px;border:0;border-radius:10px;background:#6c60eb;color:white;font-weight:700;margin-top:12px}
.secondaryBtn{width:100%;padding:11px;border:1px solid #38425d;border-radius:10px;background:transparent;color:#e7eaff;margin-top:8px}
.notice{margin:12px 18px 0;padding:10px 12px;background:#222d49;border:1px solid #374363;border-radius:10px;color:#dbe1ff;font-size:12px}
.mobileBack{display:none}
@media(max-width:650px){
.sidebar{width:100%;border-right:0}
.main{width:100%}
.app.showChat .sidebar{display:none}
.app:not(.showChat) .main{display:none}
.mobileBack{display:inline-grid}
.header{padding:0 12px;height:70px}
.messages{padding:18px 12px}
.composerArea{padding:10px}
.messageRow{max-width:94%}
.brand{padding-top:16px}
}
.auth-shell{min-height:100vh;display:grid;place-items:center;padding:24px;background:radial-gradient(ellipse at 50% 0%,#17264b 0,transparent 48%),#0b1020;color:#eef0ff}
.auth-card{width:min(100%,430px);padding:clamp(24px,6vw,38px);border:1px solid #293552;border-radius:24px;background:linear-gradient(160deg,#151e34,#10172a 75%);box-shadow:0 24px 70px #020613a8}
.auth-brand{display:flex;align-items:center;justify-content:center;gap:11px;margin-bottom:26px;font-size:22px;font-weight:800;letter-spacing:-.5px}
.auth-brand-mark{width:42px;height:42px;display:grid;place-items:center;border:1px solid #7782ff55;border-radius:15px;background:linear-gradient(140deg,#5a8dff,#6754e8);box-shadow:0 8px 24px #476df044}
.auth-brand-accent{color:#8c9dff}
.auth-title{margin:0;text-align:center;font-size:25px;letter-spacing:-.6px}
.auth-description{margin:9px 0 26px;text-align:center;color:#aab5d0;font-size:13px;line-height:1.6}
.auth-field{display:block;margin:16px 0;color:#c9d1e6;font-size:12px;font-weight:650;text-align:left}
.auth-input{width:100%;height:48px;margin-top:8px;padding:0 14px;border:1px solid #303c5b;border-radius:12px;outline:none;background:#0c1324;color:#f3f5ff;font-size:14px;transition:border-color .18s,box-shadow .18s}
.auth-input::placeholder{color:#7885a4}
.auth-input:focus{border-color:#7185ff;box-shadow:0 0 0 3px #7185ff26}
.auth-password-wrap{position:relative}
.auth-password-wrap .auth-input{padding-right:48px}
.auth-visibility{position:absolute;right:6px;top:14px;display:grid;place-items:center;width:36px;height:36px;border:0;border-radius:9px;background:transparent;color:#aab5d0}
.auth-visibility:hover{background:#202b46;color:#fff}
.auth-submit{width:100%;height:48px;margin-top:8px;border:0;border-radius:12px;background:linear-gradient(110deg,#4d8dff,#6758ec);color:#fff;font-weight:750;box-shadow:0 9px 22px #536ff033}
.auth-submit:hover:not(:disabled){filter:brightness(1.08)}
.auth-submit:disabled,.auth-switch:disabled{cursor:not-allowed;opacity:.65}
.auth-switch{display:block;width:100%;margin-top:18px;padding:9px;border:0;background:transparent;color:#aebcff;font-size:13px;font-weight:650}
.auth-switch:hover:not(:disabled){color:#fff}
.auth-feedback{margin:14px 0 0;font-size:12px;line-height:1.5;text-align:left}
.auth-error{color:#ff9ba7}
.auth-success{color:#78e6ba}
.auth-loading{color:#c5cdeb;font-size:14px}
@media(max-width:480px){.auth-shell{padding:16px}.auth-card{border-radius:20px;padding:25px 21px}}
`;

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  
const [activeTab, setActiveTab] = useState<
  "Chats" | "Updates" | "Communities" | "Calls"
>("Chats");

const [updateDraft, setUpdateDraft] = useState("");

const [updates, setUpdates] = useState<
  { id: string; text: string; time: string }[]
>([]);

async function shareUpdate() {
  const text = updateDraft.trim();
  const currentUser = user;

  if (!text || !currentUser) {
    setNotice("Please log in to share an update.");
    return;
  }

  const ownerId = currentUser.uid;

  try {

    const docRef = await addDoc(collection(db, "updates"), {
      text,
      userId: ownerId,
      userName: currentUser.displayName || currentUser.email || "NexusChat User",
      createdAt: serverTimestamp(),
    });

    if (auth.currentUser?.uid !== ownerId) return;

    setUpdates((prev) => [
      {
        id: docRef.id,
        text,
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      },
      ...prev,
    ]);

    setUpdateDraft("");
    setNotice("Update shared successfully!");

  } catch (error) {
    if (auth.currentUser?.uid !== ownerId) return;
    console.error("Share update failed:", error);
    setNotice("Could not share update. Check Firestore rules.");
  }
}
  
const [showNewGroup, setShowNewGroup] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
const [newGroupName, setNewGroupName] = useState("");
  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [loginError, setLoginError] = useState("");
  const [loginNotice, setLoginNotice] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [chats, setChats] = useState<Chat[]>(initialChats);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [draft, setDraft] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [notice, setNotice] = useState("");

  const [modal, setModal] = useState<
    | null
    | { type: "forward"; message: Message }
    | { type: "newChat" }
    | { type: "delete"; message: Message }
  >(null);

  const [newChatName, setNewChatName] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setChats(initialChats);
      setSelectedId(null);
      setAuthReady(true);
    });

    return unsubscribe;
  }, []);
  
useEffect(() => {
  if (!user) return;
  const ownerId = user.uid;

  let cancelled = false;

  async function loadGroups() {
    try {
      const groupsQuery = query(
        collection(db, "groups"),
        where("ownerId", "==", ownerId)
      );

      const snapshot = await getDocs(groupsQuery);

      if (cancelled) return;

      const savedGroups: Chat[] = snapshot.docs.map((doc) => {
        const data = doc.data();

        return {
          id: doc.id,
          name: data.name,
          avatar: data.avatar,
          color: data.color,
          online: data.online ?? false,
          unread: data.unread ?? 0,
          messages: data.messages ?? [],
        };
      });

      setChats((previousChats) => {
        const nonGroupChats = previousChats.filter(
          (chat) => !chat.id.startsWith("group-")
        );

        return [...savedGroups, ...nonGroupChats];
      });
     }catch (error) {
      if (cancelled) return;
      console.error("Could not load groups:", error);
      setNotice("Could not load saved groups.");
    }
  }

  void loadGroups();

  return () => {
    cancelled = true;
  };
}, [user]);
  
  const selectedChat =
    chats.find((chat) => chat.id === selectedId) ?? null;

  const visibleChats = useMemo(() => {
    return chats.filter((chat) => {
      const matchesSearch = chat.name
        .toLowerCase()
        .includes(search.toLowerCase());

      const matchesFilter =
        filter === "all" || chat.unread > 0;

      return matchesSearch && matchesFilter;
    });
  }, [chats, search, filter]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedId, selectedChat?.messages.length]);

  useEffect(() => {
    if (!notice) return;

    const timeout = window.setTimeout(() => setNotice(""), 3000);

    return () => window.clearTimeout(timeout);
  }, [notice]);

  function updateChat(
    chatId: string,
    updater: (chat: Chat) => Chat
  ) {
    setChats((previous) =>
      previous.map((chat) =>
        chat.id === chatId ? updater(chat) : chat
      )
    );
  }

  function selectChat(chat: Chat) {
    setSelectedId(chat.id);

    updateChat(chat.id, (current) => ({
      ...current,
      unread: 0,
    }));

    setMenuOpen(false);
  }

  function sendMessage() {
    const text = draft.trim();

    if (!text || !selectedChat) return;

    const message: Message = {
      id: makeId(),
      text,
      sender: "me",
      time: currentTime(),
    };

    updateChat(selectedChat.id, (chat) => ({
      ...chat,
      messages: [...chat.messages, message],
    }));

    setDraft("");
  }

  async function copyMessage(message: Message) {
    try {
      await navigator.clipboard.writeText(message.text);
      setNotice("Message copied!");
    } catch {
      setNotice("Copy unavailable. Please copy manually.");
    }
  }

  function deleteMessage(message: Message) {
    if (!selectedChat) return;

    updateChat(selectedChat.id, (chat) => ({
      ...chat,
      messages: chat.messages.filter(
        (item) => item.id !== message.id
      ),
    }));

    setModal(null);
    setNotice("Message removed from this demo chat.");
  }

  function forwardMessage(
    targetChatId: string,
    message: Message
  ) {
    const forwarded: Message = {
      id: makeId(),
      text: message.text,
      sender: "me",
      time: currentTime(),
      forwarded: true,
    };

    updateChat(targetChatId, (chat) => ({
      ...chat,
      messages: [...chat.messages, forwarded],
    }));

    setModal(null);
    setSelectedId(targetChatId);
    setNotice("Message forwarded in this demo.");
  }

  function createChat() {
    const name = newChatName.trim();

    if (!name) return;

    const chat: Chat = {
      id: makeId(),
      name,
      avatar: name.charAt(0).toUpperCase(),
      color: "#8177ff",
      online: false,
      unread: 0,
      messages: [],
    };

    setChats((previous) => [chat, ...previous]);
    setSelectedId(chat.id);
    setNewChatName("");
    setModal(null);
    setNotice("Demo chat created.");
  }
  async function sendEmailLogin(event?: React.FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setLoginError("");
    setLoginNotice("");

    const email = emailAddress.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setLoginError("Enter a valid email address.");
      return;
    }
    if (password.length < 6) {
      setLoginError("Password must be at least 6 characters.");
      return;
    }
    if (isRegistering && password !== confirmPassword) {
      setLoginError("The passwords do not match.");
      return;
    }

    setLoginLoading(true);
    try {
      if (isRegistering) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }

      const successMessage = isRegistering
        ? "Your NexusChat account is ready."
        : "You are signed in.";
      setLoginNotice(successMessage);
      setNotice(successMessage);
      setPassword("");
      setConfirmPassword("");
    } catch (error: unknown) {
      const code =
        typeof error === "object" && error !== null && "code" in error
          ? String(error.code)
          : "";

      const messages: Record<string, string> = {
        "auth/invalid-email": "Enter a valid email address.",
        "auth/invalid-credential": "Email or password is incorrect.",
        "auth/user-not-found": "No account was found for that email.",
        "auth/wrong-password": "Email or password is incorrect.",
        "auth/email-already-in-use": "An account already exists for that email. Try signing in.",
        "auth/weak-password": "Choose a password with at least 6 characters.",
        "auth/operation-not-allowed": "Enable Email/Password sign-in in Firebase Authentication.",
        "auth/network-request-failed": "Could not reach Firebase. Check your connection and try again.",
        "auth/too-many-requests": "Too many attempts. Wait a while and try again.",
        "auth/user-disabled": "This account is disabled. Contact the app administrator.",
      };
      setLoginError(
        messages[code] ??
          "Could not complete authentication. Check your details and try again.",
      );
    } finally {
      setLoginLoading(false);
    }
  }
  
async function handleSignOut() {
  try {
    await signOut(auth);
  } catch {
    setNotice("Could not sign out. Please try again.");
  }
}
  
  if (!authReady) {
    return (
      <>
        <style>{css}</style>
        <main className="auth-shell">
          <div className="auth-loading" role="status">Checking your account…</div>
        </main>
      </>
    );
  }

  if (!user) {
    return (
      <>
        <style>{css}</style>
        <main className="auth-shell">
          <section className="auth-card" aria-labelledby="auth-title">
            <div className="auth-brand">
              <span className="auth-brand-mark" aria-hidden="true">
                <MessageCircle size={21} />
              </span>
              <span>
                Nexus<span className="auth-brand-accent">Chat</span>
              </span>
            </div>

            <h1 id="auth-title" className="auth-title">
              {isRegistering ? "Create your account" : "Welcome back"}
            </h1>
            <p className="auth-description">
              {isRegistering
                ? "Sign up with email and password to get started."
                : "Sign in to continue to your conversations."}
            </p>

            <form
              onSubmit={(event) => void sendEmailLogin(event)}
              aria-busy={loginLoading}
            >
              <label className="auth-field">
                Email address
                <input
                  className="auth-input"
                  type="email"
                  name="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                  value={emailAddress}
                  onChange={(event) => setEmailAddress(event.target.value)}
                  disabled={loginLoading}
                />
              </label>

              <label className="auth-field">
                Password
                <span className="auth-password-wrap">
                  <input
                    className="auth-input"
                    type={showPassword ? "text" : "password"}
                    name="password"
                    placeholder="At least 6 characters"
                    autoComplete={
                      isRegistering ? "new-password" : "current-password"
                    }
                    minLength={6}
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    disabled={loginLoading}
                  />
                  <button
                    className="auth-visibility"
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                    disabled={loginLoading}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </span>
              </label>

              {isRegistering && (
                <label className="auth-field">
                  Confirm password
                  <input
                    className="auth-input"
                    type={showPassword ? "text" : "password"}
                    name="confirmPassword"
                    placeholder="Re-enter your password"
                    autoComplete="new-password"
                    minLength={6}
                    required
                    value={confirmPassword}
                    onChange={(event) =>
                      setConfirmPassword(event.target.value)
                    }
                    disabled={loginLoading}
                  />
                </label>
              )}

              {loginError && (
                <p className="auth-feedback auth-error" role="alert">
                  {loginError}
                </p>
              )}
              {loginNotice && (
                <p className="auth-feedback auth-success" role="status">
                  {loginNotice}
                </p>
              )}

              <button
                className="auth-submit"
                type="submit"
                disabled={loginLoading}
              >
                {loginLoading
                  ? isRegistering
                    ? "Creating account…"
                    : "Signing in…"
                  : isRegistering
                    ? "Create account"
                    : "Log in"}
              </button>
            </form>

            <button
              className="auth-switch"
              type="button"
              disabled={loginLoading}
              onClick={() => {
                setIsRegistering((registering) => !registering);
                setConfirmPassword("");
                setPassword("");
                setLoginError("");
                setLoginNotice("");
              }}
            >
              {isRegistering
                ? "Already have an account? Log in"
                : "New to NexusChat? Create an account"}
            </button>
          </section>
        </main>
      </>
    );
  }
  if (showSettings) {
  return (
    <Settings
      onBack={() => {
        setShowSettings(false);
        setSelectedId(null);
      }}
    />
  );
  }

 return (
    <>
      <style>{css}</style>
{showNewGroup && (
  <div
    style={{
      position: "fixed",
      inset: 0,
      zIndex: 1000,
      background: "#0009",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 20,
    }}
  >
    <div
      style={{
        background: "#172338",
        padding: 24,
        borderRadius: 14,
        width: "100%",
        maxWidth: 360,
        color: "white",
      }}
    >
      <h2>New Group</h2>

      <input
        value={newGroupName}
        onChange={(event) => setNewGroupName(event.target.value)}
        placeholder="Enter group name"
        style={{
          width: "100%",
          padding: 12,
          marginBottom: 16,
          borderRadius: 8,
          border: "1px solid #30415a",
          background: "#0b1020",
          color: "white",
        }}
      />

      <div style={{ display: "flex", gap: 10 }}>
        <button
          type="button"
          onClick={() => {
            setShowNewGroup(false);
            setNewGroupName("");
          }}
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={async () => {
            setNotice("Create Group button clicked!");
            const name = newGroupName.trim();
            const ownerId = user?.uid;

            if (!name) {
              setNotice("Please enter a group name.");
              return;
            }

            if (!ownerId) {
              setNotice("Please log in first.");
              return;
            }

            const newChat: Chat = {
              id: `group-${Date.now()}`,
              name,
              avatar: name.slice(0, 2).toUpperCase(),
              color: "#2563eb",
              online: false,
              unread: 0,
              messages: [],
            };

            try {
              await addDoc(collection(db, "groups"), {
                ...newChat,
                ownerId,
                createdAt: new Date(),
              });

              if (auth.currentUser?.uid !== ownerId) return;

              setChats((previousChats) => [newChat, ...previousChats]);
              setShowNewGroup(false);
              setNewGroupName("");
              setNotice(`Group "${name}" created successfully.`);
            } catch (error) {
              if (auth.currentUser?.uid !== ownerId) return;
              console.error("Group save failed:", error);
              setNotice(
                error instanceof Error
                  ? error.message
                  : String(error)
              );
            }
  }}
        > 
    
          Create Group
        </button>
      </div>
    </div>
  </div>
)}
      <div className={`app ${selectedChat ? "showChat" : ""}`}>
        
{!selectedChat && (
  <nav
    style={{
      position: "fixed",
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 100,
      display: "flex",
      justifyContent: "space-around",
      background: "#101a2b",
      borderTop: "1px solid #26364b",
      padding: "10px 4px",
    }}
  >
    {([
      { name: "Chats", icon: "💬" },
      { name: "Updates", icon: "⭕" },
      { name: "Communities", icon: "👥" },
      { name: "Calls", icon: "📞" },
    ] as const).map((tab) => (
      <button
        key={tab.name}
        type="button"
        onClick={() => setActiveTab(tab.name)}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 4,
          border: 0,
          background: activeTab === tab.name ? "#263b4c" : "transparent",
          color: activeTab === tab.name ? "#65e6b2" : "#c5cfdb",
          borderRadius: 10,
          padding: "8px 10px",
          fontSize: 12,
        }}
      >
        <span style={{ fontSize: 20 }}>{tab.icon}</span>
        <span>{tab.name}</span>
      </button>
    ))}
  </nav>
)}
        
        <aside className="sidebar">
          <div
  className="brand"
  style={{
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    position: "relative",
  }}
>
  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
    <div className="brandIcon">
      <MessageCircle size={22} color="white" />
    </div>

    <span>
      Nexus<span className="brandAccent">Chat</span>
    </span>
  </div>

  <button
    type="button"
    aria-label="More options"
    onClick={() => setShowMenu((previous) => !previous)}
    style={{
      background: "transparent",
      border: "none",
      color: "white",
      fontSize: 26,
      cursor: "pointer",
      padding: "4px 10px",
    }}
  >
    ⋮
  </button>
</div>

          <div className="searchWrap"> 
            {showMenu && (
  <div
    style={{
      position: "absolute",
      right: 12,
      top: 58,
      zIndex: 200,
      background: "#172338",
      border: "1px solid #30415a",
      borderRadius: 10,
      padding: 8,
      minWidth: 190,
      boxShadow: "0 8px 24px #0006",
    }}
  >
    <button
      type="button"
      onClick={() => {
  setShowMenu(false);
  setShowNewGroup(true);
}}
      style={menuButtonStyle}
    >
      👥 New Group
    </button>

    <button
      type="button"
      onClick={() => {
        setShowMenu(false);
        setNotice("New Community selected.");
      }}
      style={menuButtonStyle}
    >
      🌐 New Community
    </button>

    <button
      type="button"
      onClick={() => {
        setShowMenu(false);
        setNotice("Broadcast List selected.");
      }}
      style={menuButtonStyle}
    >
      📢 Broadcast List
    </button>

    <button
      type="button"
      onClick={() => {
        setShowMenu(false);
        setNotice("Profile settings coming soon.");
      }}
      style={menuButtonStyle}
    >
      Profile
    </button>

    
<button
  type="button"
  onClick={() => {
    setShowMenu(false);
    setShowSettings(true);
  }}
  style={menuButtonStyle}
>
  Settings
</button>
    

    <button
      type="button"
      onClick={() => {
        setShowMenu(false);
        void handleSignOut();
      }}
      style={menuButtonStyle}
    >
      Logout
    </button>
  </div>
)}
            <Search size={17} />

            <input
              className="search"
              placeholder="Search conversations..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <div className="filters">
            <button
              className={`filter ${
                filter === "all" ? "active" : ""
              }`}
              onClick={() => setFilter("all")}
            >
              All chats
            </button>

            <button
              className={`filter ${
                filter === "unread" ? "active" : ""
              }`}
              onClick={() => setFilter("unread")}
            >
              Unread
            </button>
          </div>

          {activeTab === "Updates" ? (
  <div style={{ padding: 16, color: "#eaf0ff" }}>
    <h2>Updates</h2>

    <textarea
      value={updateDraft}
      onChange={(e) => setUpdateDraft(e.target.value)}
      placeholder="What's on your mind?"
      maxLength={500}
      style={{
        width: "100%",
        minHeight: 100,
        padding: 12,
        borderRadius: 12,
        boxSizing: "border-box",
      }}
    />

<button
  type="button"
  onClick={shareUpdate}  
  >
      Share Update
    </button>

    {updates.map((item) => (
      <div key={item.id} style={{ padding: 12 }}>
        <p>{item.text}</p>
        <small>{item.time}</small>
      </div>
    ))}
  </div>
) : (
  <div className="sectionLabel">Messages</div>
)}

          <div className="chatList">
            {visibleChats.map((chat) => {
              const lastMessage =
                chat.messages[chat.messages.length - 1];

              return (
                <button
                  key={chat.id}
                  className={`chatItem ${
                    selectedId === chat.id ? "selected" : ""
                  }`}
                  onClick={() => selectChat(chat)}
                >
                  <div
                    className="avatar"
                    style={{ background: chat.color }}
                  >
                    {chat.avatar}
                  </div>

                  <div className="chatInfo">
                    <div className="chatTop">
                      <span className="chatName">{chat.name}</span>
                      <span className="chatTime">
                        {lastMessage?.time ?? ""}
                      </span>
                    </div>

                    <div className="chatTop">
                      <span className="lastMessage">
                        {lastMessage?.text ?? "No messages yet"}
                      </span>

                      {chat.unread > 0 && (
                        <span className="unread">
                          {chat.unread}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}

            {visibleChats.length === 0 && (
              <div className="empty">
                <p>No conversations found.</p>
              </div>
            )}
          </div>
          
          <div className="profile">
            <div className="avatar" style={{ background: "#344466" }}>
              <UserIcon size={21} />
            </div>

            <div className="profileInfo">
              <div className="profileName">
                {user?.displayName || "NexusChat User"}
              </div>

              <div className="profileEmail">
                {authReady
                  ? user?.email || user?.phoneNumber || "Demo mode"
                  : "Checking account..."}
              </div>
            </div>

            <button
              className="iconBtn"
              title="Account menu"
              onClick={() => setMenuOpen((open) => !open)}
            >
              <SettingsIcon size={18} />
            </button>
          </div>
        </aside>

        <main className="main">
          {!selectedChat ? (
            <div className="empty">
              <div className="emptyIcon">
                <MessageCircle size={37} />
              </div>

              <h2>Welcome to NexusChat</h2>

              <p>
                Select a conversation to start chatting, or create a new
                demo conversation.
              </p>

              <button
                className="primaryBtn"
                style={{ maxWidth: 220 }}
                onClick={() => setModal({ type: "newChat" })}
              >
                <Plus size={16} /> New chat
              </button>
            </div>
          ) : (
            <>
              <header className="header">
                <button
                  className="iconBtn mobileBack"
                  title="Back to chats"
                  onClick={() => setSelectedId(null)}
                >
                  <ArrowLeft size={20} />
                </button>

                <div
                  className="avatar"
                  style={{
                    background: selectedChat.color,
                    width: 42,
                    height: 42,
                  }}
                >
                  {selectedChat.avatar}
                </div>

                <div className="headerInfo">
                  <div className="headerName">
                    {selectedChat.name}
                  </div>

                  <div
                    className={
                      selectedChat.online
                        ? "onlineText"
                        : "offlineText"
                    }
                  >
                    {selectedChat.online
                      ? "● Online"
                      : "Demo conversation"}
                  </div>
                </div>

                <button
                  className="iconBtn"
                  title="New chat"
                  onClick={() => setModal({ type: "newChat" })}
                >
                  <Plus size={19} />
                </button> <button
  className="iconBtn"
  title="Audio call"
  onClick={() => alert("Audio calling setup abhi baaki hai")}
>
  <Phone size={19} />
</button>

<button
  className="iconBtn"
  title="Video call"
  onClick={() => alert("Video calling setup abhi baaki hai")}
>
  <Video size={19} />
</button>

                <div className="menuWrap">
                  <button
                    className="iconBtn"
                    title="Chat menu"
                    onClick={() => setMenuOpen((open) => !open)}
                  >
                    <MoreVertical size={21} />
                  </button>

                  {menuOpen && (
                    <div className="dropdown">
                      <button
                        onClick={() => {
                          setMenuOpen(false);
                          setNotice("Chat: " + selectedChat.name);
                        }}
                      >
                        <MessageCircle size={15} />
                        Chat information
                      </button>

                      <button
                        onClick={() => {
                          setMenuOpen(false);
                          setModal({ type: "newChat" });
                        }}
                      >
                        <Plus size={15} />
                        Create new chat
                      </button>

                      <button onClick={handleSignOut}>
                        <LogOut size={15} />
                        Sign out
                      </button>
                      
<button
  onClick={() => {
    setMenuOpen(false);
    setShowSettings(true);
  }}
>
  <SettingsIcon size={18} />
  Settings
</button>
                      
                    </div>
                  )}
                </div>
              </header>

              {notice && <div className="notice">{notice}</div>}

              <section className="messages">
                <div className="day">TODAY</div>

                {selectedChat.messages.map((message) => (
                  <div
                    key={message.id}
                    className={`messageRow ${
                      message.sender === "me" ? "mine" : ""
                    }`}
                  >
                    <div className="bubble">
                      {message.forwarded && (
                        <div className="forwardedLabel">
                          <Forward size={12} />
                          Forwarded
                        </div>
                      )}

                      <div className="messageText">
                        {message.text}
                      </div>

                      <div className="messageMeta">
                        <span>{message.time}</span>

                        {message.sender === "me" && (
                          <CheckCheck
                            size={13}
                            color="#c7c1ff"
                          />
                        )}
                      </div>
                    </div>

                    <div className="messageActions">
                      <button
                        className="iconBtn"
                        title="Copy message"
                        onClick={() => copyMessage(message)}
                      >
                        <Copy size={14} />
                      </button>

                      <button
                        className="iconBtn"
                        title="Forward message"
                        onClick={() =>
                          setModal({
                            type: "forward",
                            message,
                          })
                        }
                      >
                        <Forward size={14} />
                      </button>

                      <button
                        className="iconBtn"
                        title="Delete message"
                        onClick={() =>
                          setModal({
                            type: "delete",
                            message,
                          })
                        }
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}

                {selectedChat.messages.length === 0 && (
                  <div className="empty">
                    <div className="emptyIcon">
                      <MessageCircle size={32} />
                    </div>

                    <h2>Start a conversation</h2>
                    <p>Send the first message below.</p>
                  </div>
                )}

                <div ref={bottomRef} />
              </section>

              <div className="composerArea">
                <form
                  className="composer"
                  onSubmit={(event) => {
                    event.preventDefault();
                    sendMessage();
                  }}
                >
                  <input
                    value={draft}
                    onChange={(event) =>
                      setDraft(event.target.value)
                    }
                    placeholder={`Message ${selectedChat.name}...`}
                    aria-label="Message"
                  />

                  <button
                    type="submit"
                    className="sendBtn"
                    title="Send message"
                    disabled={!draft.trim()}
                    style={{
                      opacity: draft.trim() ? 1 : 0.55,
                    }}
                  >
                    <Send size={18} />
                  </button>
                </form>

                <div className="hint">
                  Demo chat · Press Enter to send
                </div>
              </div>
            </>
          )}
        </main>
      </div>
      
      {notice && !selectedChat && (
        <div className="notice">{notice}</div>
      )}

      {modal && (
        <div
          className="modalBackdrop"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setModal(null);
            }
          }}
        >
          <div className="modal">
            <div className="modalHead">
              <h3>
                {modal.type === "forward"
                  ? "Forward message"
                  : modal.type === "delete"
                    ? "Delete message?"
                    : "Create a new chat"}
              </h3>

              <button
                className="iconBtn"
                title="Close"
                onClick={() => setModal(null)}
              >
                <X size={19} />
              </button>
            </div>

            {modal.type === "forward" && (
              <>
                <p>
                  Choose a demo conversation to forward this message to.
                </p>

                <div className="modalList">
                  {chats
                    .filter((chat) => chat.id !== selectedId)
                    .map((chat) => (
                      <button
                        key={chat.id}
                        className="modalChat"
                        onClick={() =>
                          forwardMessage(chat.id, modal.message)
                        }
                      >
                        <div
                          className="avatar"
                          style={{
                            background: chat.color,
                            width: 35,
                            height: 35,
                            borderRadius: 11,
                          }}
                        >
                          {chat.avatar}
                        </div>

                        <span>{chat.name}</span>
                        <Forward size={15} />
                      </button>
                    ))}

                  {chats.filter((chat) => chat.id !== selectedId)
                    .length === 0 && (
                    <p>Create another chat before forwarding.</p>
                  )}
                </div>

                <button
                  className="secondaryBtn"
                  onClick={() => setModal(null)}
                >
                  Cancel
                </button>
              </>
            )}

            {modal.type === "delete" && (
              <>
                <p>
                  This removes the message from this local demo
                  conversation. It does not delete a message from
                  another user's device.
                </p>

                <button
                  className="primaryBtn"
                  onClick={() => deleteMessage(modal.message)}
                >
                  <Trash2
                    size={15}
                    style={{ verticalAlign: "middle" }}
                  />{" "}
                  Delete message
                </button>

                <button
                  className="secondaryBtn"
                  onClick={() => setModal(null)}
                >
                  Cancel
                </button>
              </>
            )}

            {modal.type === "newChat" && (
              <>
                <p>
                  Enter a name to create a new local demo conversation.
                </p>

                <input
                  className="search"
                  placeholder="Enter chat name"
                  value={newChatName}
                  onChange={(event) =>
                    setNewChatName(event.target.value)
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      createChat();
                    }
                  }}
                  autoFocus
                />

                <button
                  className="primaryBtn"
                  disabled={!newChatName.trim()}
                  onClick={createChat}
                >
                  <Plus
                    size={16}
                    style={{ verticalAlign: "middle" }}
                  />{" "}
                  Create chat
                </button>

                <button
                  className="secondaryBtn"
                  onClick={() => setModal(null)}
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
