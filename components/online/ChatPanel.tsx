"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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

// Not persisted anywhere (see upgrades/archive/08-chat.md) — messages live
// only in the parent's component state for the duration of the room,
// passed in as props here.
export default function ChatPanel({ messages, onSend }: ChatPanelProps) {
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
    <Card>
      <CardHeader>
        <CardTitle>💬 Chat</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <div ref={listRef} className="flex max-h-50 min-h-25 flex-col gap-1 overflow-y-auto rounded-lg bg-input p-2.5 text-sm">
          {messages.length === 0 ? (
            <p className="text-xs text-muted-foreground">No messages yet — say hi!</p>
          ) : (
            messages.map((m, i) => (
              <div key={i} className="break-words">
                <span className={cn("font-bold", m.mine && "text-primary")}>{m.mine ? "You" : m.senderDisplayName}:</span> {m.text}
              </div>
            ))
          )}
        </div>
        <form className="flex gap-2" onSubmit={submit}>
          <Input
            className="flex-1"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Type a message..."
            maxLength={MAX_MESSAGE_LENGTH}
          />
          <Button variant="secondary" type="submit">Send</Button>
        </form>
      </CardContent>
    </Card>
  );
}
