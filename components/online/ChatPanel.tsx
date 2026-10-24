"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "@/components/ui/Icon";
import { useDictionary } from "@/lib/i18n/useDictionary";

export interface ChatMessage {
  text: string;
  senderDisplayName: string;
  mine: boolean;
}

interface ChatPanelProps {
  messages: ChatMessage[];
  onSend: (text: string) => void;
}

const MAX_MESSAGE_LENGTH = 300;

// Not persisted anywhere (see upgrades/08-chat.md) — messages live only in
// the parent's component state for the duration of the room, passed in as
// props here.
export default function ChatPanel({ messages, onSend }: ChatPanelProps) {
  const dict = useDictionary();
  const t = dict.battle.chat;
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    onSend(text);
    setDraft("");
  }

  return (
    <section className="panel chat-panel" aria-label={t.title}>
      <div className="panel-head"><h2>{t.title}</h2></div>
      <div className="chat-messages" ref={listRef} aria-live="polite">
        {messages.length === 0 ? (
          <p className="chat-empty">{t.empty}</p>
        ) : (
          messages.map((m, i) => (
            <div key={i} className={`chat-message${m.mine ? " mine" : ""}`}>
              {!m.mine && <span className="chat-sender">{m.senderDisplayName}</span>}
              <span className="chat-bubble">{m.text}</span>
            </div>
          ))
        )}
      </div>
      <form className="chat-input-row" onSubmit={submit}>
        <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={t.placeholder} maxLength={MAX_MESSAGE_LENGTH} aria-label={t.placeholder} />
        <button className="icon-btn" type="submit" aria-label={t.send}>
          <Icon name="send" size={16} />
        </button>
      </form>
    </section>
  );
}
