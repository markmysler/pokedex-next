"use client";

import { useEffect, useRef, useState } from "react";
import CardTab from "@/components/ui/CardTab";
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
    <div className="card chat-panel">
      <CardTab icon="💬" label={t.title} />
      <div className="chat-messages" ref={listRef}>
        {messages.length === 0 ? (
          <p className="chat-empty">{t.empty}</p>
        ) : (
          messages.map((m, i) => (
            <div key={i} className={`chat-message${m.mine ? " mine" : ""}`}>
              <span className="chat-sender">{m.mine ? t.you : m.senderDisplayName}:</span> {m.text}
            </div>
          ))
        )}
      </div>
      <form className="chat-input-row" onSubmit={submit}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t.placeholder}
          maxLength={MAX_MESSAGE_LENGTH}
        />
        <button className="btn-secondary" type="submit">{t.send}</button>
      </form>
    </div>
  );
}
