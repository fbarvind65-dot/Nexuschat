
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
onAuthStateChanged,
signOut,
RecaptchaVerifier,
signInWithPhoneNumber,
type ConfirmationResult,
type User,
} from "firebase/auth";
import { auth } from "./firebase";
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
  Settings,
  Trash2,
  User as UserIcon,
  Phone,
  Video,
  X,
} from "lucide-react";

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

function normalizePhoneNumber(input: string): string | null {
  const compact = input.trim().replace(/[\s().-]/g, "");
  const phone = compact.startsWith("00") ? `+${compact.slice(2)}` : compact;
  return /^\+[1-9]\d{1,14}$/.test(phone) ? phone : null;
}

function getPhoneAuthErrorMessage(error: unknown, stage: "send" | "verify") {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code?: unknown }).code ?? "")
      : "";

  switch (code) {
    case "auth/invalid-phone-number":
    case "auth/missing-phone-number":
      return "Enter a valid phone number with its country code, such as +91 98765 43210.";
    case "auth/captcha-check-failed":
    case "auth/invalid-app-credential":
    case "auth/missing-app-credential":
      return "reCAPTCHA verification failed. Try again and check that this domain is authorized in Firebase.";
    case "auth/unauthorized-domain":
      return "This domain is not authorized for Firebase sign-in. Add it to Firebase Authentication's authorized domains.";
    case "auth/operation-not-allowed":
      return "Phone sign-in is not enabled for this Firebase project.";
    case "auth/too-many-requests":
      return "There have been too many attempts. Wait a while before trying again.";
    case "auth/quota-exceeded":
      return "The Firebase SMS quota has been reached. Try again later or check the project's SMS limits.";
    case "auth/network-request-failed":
      return "Could not reach Firebase. Check your internet connection and try again.";
    case "auth/invalid-verification-code":
    case "auth/missing-verification-code":
      return "Enter the 6-digit code from the text message.";
    case "auth/code-expired":
    case "auth/session-expired":
      return "That code has expired. Request a new code and try again.";
    default:
      return stage === "send"
        ? "Could not send the code. Check the number and try again."
        : "Could not verify that code. Check the 6 digits and try again.";
  }
}

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
`;

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);
  const [loginError, setLoginError] = useState("");
  const [loginNotice, setLoginNotice] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [chats, setChats] = useState<Chat[]>(initialChats);
  const [selectedId, setSelectedId] = useState<string | null>("1");
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
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthReady(true);
    });

    return unsubscribe;
  }, []);
  useEffect(() => {
    return () => {
      try {
        recaptchaRef.current?.clear();
      } catch {
        // Firebase may already have removed the widget during an auth transition.
      }
      recaptchaRef.current = null;
    };
  }, []);

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
  function resetRecaptcha() {
    const verifier = recaptchaRef.current;
    recaptchaRef.current = null;
    if (!verifier) return;
    try {
      verifier.clear();
    } catch {
      // The verifier can already be cleared after a failed or completed attempt.
    }
  }

  async function sendOTP() {
    setLoginError("");
    setLoginNotice("");
    const phone = normalizePhoneNumber(phoneNumber);

    if (!phone) {
      setLoginError("Enter a valid international number, such as +91 98765 43210.");
      return;
    }

    setPhoneNumber(phone);
    setLoginLoading(true);

    try {
      if (!document.getElementById("recaptcha-container")) {
        throw new Error("The reCAPTCHA container is unavailable.");
      }

      if (!recaptchaRef.current) {
        recaptchaRef.current = new RecaptchaVerifier(
          auth,
          "recaptcha-container",
          {},
        );
      }

      const result = await signInWithPhoneNumber(
        auth,
        phone,
        recaptchaRef.current,
      );

      setConfirmation(result);
      setOtp("");
      setLoginNotice("Verification code sent. Enter the 6-digit code.");
      resetRecaptcha();
    } catch (error) {
      resetRecaptcha();
      setLoginError(getPhoneAuthErrorMessage(error, "send"));
    } finally {
      setLoginLoading(false);
    }
  }

  async function verifyOTP() {
    setLoginError("");
    setLoginNotice("");

    if (!confirmation) {
      setLoginError("Request a verification code first.");
      return;
    }

    const code = otp.trim();
    if (!/^\d{6}$/.test(code)) {
      setLoginError("Enter the 6-digit verification code.");
      return;
    }

    setLoginLoading(true);
    try {
      await confirmation.confirm(code);
      resetRecaptcha();
    } catch (error) {
      setLoginError(getPhoneAuthErrorMessage(error, "verify"));
    } finally {
      setLoginLoading(false);
    }
  }

  function changePhoneNumber() {
    resetRecaptcha();
    setConfirmation(null);
    setPhoneNumber("");
    setOtp("");
    setLoginError("");
    setLoginNotice("");
  }

  async function resendOTP() {
    resetRecaptcha();
    setConfirmation(null);
    setOtp("");
    await sendOTP();
  }

  async function handleSignOut() {
    resetRecaptcha();
    setConfirmation(null);
    setOtp("");
    try {
      await signOut(auth);
    } catch {
      setNotice("Could not sign out. Please try again.");
    }
  }
  if (!authReady) {
  return (
  <div style={{
  minHeight: "100vh",
  display: "grid",
  placeItems: "center",
  background: "#0b1020",
  color: "white"
  }}>
  Checking account...
  </div>
  );
  }

  if (!user) {
  return (
  <div style={{
  minHeight: "100vh",
  display: "grid",
  placeItems: "center",
  background: "#0b1020",
  color: "white",
  padding: 24,
  textAlign: "center"
  }}>
  <div>
  <h2>NexusChat</h2>
  <h2>NexusChat</h2>
<p>Phone number se sign in karo</p>
<div id="recaptcha-container"></div>
{!confirmation ? (
<>
<input
type="tel"
placeholder="+919876543210"
autoComplete="tel"
inputMode="tel"
maxLength={25}
aria-label="Phone number with country code"
value={phoneNumber}
onChange={(e) => setPhoneNumber(e.target.value)}
onKeyDown={(e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    void sendOTP();
  }
}}
/>
<button type="button" onClick={sendOTP} disabled={loginLoading}>
{loginLoading ? "Sending..." : "Send OTP"}
</button>
</>
) : (
<>
<input
type="text"
inputMode="numeric"
autoComplete="one-time-code"
maxLength={6}
pattern="[0-9]{6}"
aria-label="6-digit verification code"
placeholder="OTP enter karo"
value={otp}
onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
onKeyDown={(e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    void verifyOTP();
  }
}}
/>
<button type="button" onClick={verifyOTP} disabled={loginLoading}>
{loginLoading ? "Verifying..." : "Verify OTP"}
</button>
<button type="button" onClick={resendOTP} disabled={loginLoading}>
Resend code
</button>
<button type="button" onClick={changePhoneNumber} disabled={loginLoading}>
Use a different number
</button>
</>
)}

{loginError && <p role="alert">{loginError}</p>}
{loginNotice && <p role="status">{loginNotice}</p>}
  </div>
  </div>
  );
  }

  return (
    <>
      <style>{css}</style>

      <div className={`app ${selectedChat ? "showChat" : ""}`}>
        <aside className="sidebar">
          <div className="brand">
            <div className="brandIcon">
              <MessageCircle size={22} color="white" />
            </div>

            <span>
              Nexus<span className="brandAccent">Chat</span>
            </span>
          </div>

          <div className="searchWrap">
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

          <div className="sectionLabel">Messages</div>

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
              <Settings size={18} />
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
