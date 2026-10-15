import React, { useState } from "react";

type SettingItem = {
  title: string;
  subtitle: string;
  icon: string;
};

const settings: SettingItem[] = [
  {
    title: "Theme and Chat Appearance",
    subtitle: "Theme, wallpaper and chat settings",
    icon: "🎨",
  },
  {
    title: "Notifications",
    subtitle: "Message and call alerts",
    icon: "🔔",
  },
  {
    title: "Storage and Data",
    subtitle: "Storage and data usage",
    icon: "💾",
  },
  {
    title: "Linked Devices",
    subtitle: "Manage connected devices",
    icon: "💻",
  },
  {
    title: "Accessibility",
    subtitle: "Make the app easier to use",
    icon: "♿",
  },
  {
    title: "Help and Feedback",
    subtitle: "Help and suggestions",
    icon: "❓",
  },
  {
    title: "Invite Your Friends",
    subtitle: "Invite friends to NexusChat",
    icon: "👥",
  },
];

export default function SettingsPage({
  onBack,
}: {
  onBack?: () => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <main
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        width: "100%",
        height: "100dvh",
        overflowY: "auto",
        boxSizing: "border-box",
        background: "#0b141a",
        color: "#ffffff",
        padding: 20,
        fontFamily: "Arial, sans-serif",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          marginBottom: 24,
        }}
      >
              <button
          type="button"
          onClick={() => {
            setSelected(null);
            onBack?.();
          }}
          aria-label="Go back"
          style={{
            border: 0,
            background: "transparent",
            color: "white",
            fontSize: 30,
            cursor: "pointer",
          }}
        >
          ←
        </button>

        <h1 style={{ fontSize: 24, margin: 0 }}>Settings</h1>
      </header>

      <section
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: 16,
          marginBottom: 20,
          borderRadius: 16,
          background: "#17252d",
        }}
      >
        <div style={{ fontSize: 32 }}>👤</div>
        <div>
          <h2 style={{ margin: 0, fontSize: 18 }}>NexusChat User</h2>
          <p style={{ color: "#a8bac3", fontSize: 13 }}>
            Profile and account settings
          </p>
        </div>
      </section>

      {selected ? (
        <section
          style={{
            padding: 16,
            borderRadius: 16,
            background: "#17252d",
          }}
        >
          <h2>{selected}</h2>
          <p style={{ color: "#a8bac3" }}>
            Is feature ki settings yahan add ki jayengi.
          </p>
          <button
            type="button"
            onClick={() => setSelected(null)}
            style={{
              padding: "10px 16px",
              border: 0,
              borderRadius: 10,
              background: "#00a884",
              color: "#0b141a",
              cursor: "pointer",
            }}
          >
            Back to Settings
          </button>
        </section>
      ) : (
        <section>
          {settings.map((item) => (
            <button
              key={item.title}
              type="button"
              onClick={() => setSelected(item.title)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                width: "100%",
                padding: "16px 0",
                textAlign: "left",
                color: "white",
                background: "transparent",
                border: 0,
                borderBottom: "1px solid #26343b",
                cursor: "pointer",
              }}
            >
              <span style={{ fontSize: 25 }}>{item.icon}</span>
              <span style={{ flex: 1 }}>
                <span style={{ display: "block", fontSize: 14 }}>
                  {item.title}
                </span>
                <span
                  style={{
                    display: "block",
                    marginTop: 5,
                    fontSize: 12,
                    color: "#8696a0",
                  }}
                >
                  {item.subtitle}
                </span>
              </span>
              <span style={{ fontSize: 22, color: "#8696a0" }}>›</span>
            </button>
          ))}
        </section>
      )}
    </main>
  );
}