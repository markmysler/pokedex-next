"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { OwnedPokemon } from "@/types/pokemon";
import { getSupabaseBrowserClient } from "@/lib/supabase/browserClient";
import ChatPanel, { type ChatMessage } from "@/components/online/ChatPanel";
import PokemonMultiPicker from "@/components/pokemon/PokemonMultiPicker";
import PokemonInstanceCard from "@/components/inventory/PokemonInstanceCard";
import CardTab from "@/components/ui/CardTab";

interface PendingTrade {
  id: string;
  offeredBy: string;
  isMine: boolean;
  offered: OwnedPokemon[];
  requested: OwnedPokemon[];
  createdAt: string;
}

interface FriendChatPageClientProps {
  friendshipId: string;
  myUserId: string;
  friendDisplayName: string;
  initialMessages: ChatMessage[];
  initialTrades: PendingTrade[];
  myInventory: OwnedPokemon[];
  friendInventory: OwnedPokemon[];
  typesList: string[];
}

// Purely informational in a pending-trade row -- no selection state, so
// this is a no-op. PokemonInstanceCard's onSelect is required, not
// optional, since every other caller (PokemonMultiPicker, TeamPicker) is
// genuinely interactive.
function noop() {}

function TradeSideCards({ pokemon }: { pokemon: OwnedPokemon[] }) {
  return (
    <div className="trade-row-cards">
      {pokemon.map((p) => (
        <PokemonInstanceCard key={p.id} pokemon={p} variant="grid" selected={false} onSelect={noop} />
      ))}
    </div>
  );
}

export default function FriendChatPageClient({
  friendshipId,
  myUserId,
  friendDisplayName,
  initialMessages,
  initialTrades,
  myInventory,
  friendInventory,
  typesList,
}: FriendChatPageClientProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [trades, setTrades] = useState<PendingTrade[]>(initialTrades);
  const [showBuilder, setShowBuilder] = useState(false);
  const [myOffered, setMyOffered] = useState<string[]>([]);
  const [requested, setRequested] = useState<string[]>([]);
  const [proposing, setProposing] = useState(false);
  const [tradeError, setTradeError] = useState("");
  const [busyTradeId, setBusyTradeId] = useState<string | null>(null);

  const refreshTrades = useCallback(async () => {
    const res = await fetch(`/api/friends/${friendshipId}/trades`);
    const data = await res.json();
    if (!data.error) setTrades(data.trades);
  }, [friendshipId]);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    const channel = supabase
      .channel(`friendship:${friendshipId}`)
      .on("broadcast", { event: "friend-message" }, ({ payload }) => {
        const p = payload as { text: string; senderDisplayName: string; senderId: string };
        // Our own sent messages are already appended optimistically by
        // sendMessage() below -- only append the *other* party's messages
        // that arrive over this live channel. Compared by id, not display
        // name -- profiles.display_name has no uniqueness constraint, so a
        // name match alone wouldn't reliably distinguish sender from self.
        if (p.senderId !== myUserId) {
          setMessages((prev) => [...prev, { text: p.text, senderDisplayName: p.senderDisplayName, mine: false }]);
        }
      })
      .on("broadcast", { event: "trade-offer" }, () => refreshTrades())
      .on("broadcast", { event: "trade-resolved" }, () => refreshTrades())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [friendshipId, myUserId, refreshTrades]);

  async function sendMessage(text: string) {
    setMessages((prev) => [...prev, { text, senderDisplayName: "You", mine: true }]);
    const res = await fetch(`/api/friends/${friendshipId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    const data = await res.json();
    if (data.error) {
      setMessages((prev) => [...prev, { text: `⚠️ Message failed to send: ${data.error}`, senderDisplayName: "System", mine: false }]);
    }
  }

  function toggleOffered(id: string) {
    setMyOffered((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }
  function toggleRequested(id: string) {
    setRequested((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function proposeTrade() {
    if (myOffered.length === 0 || requested.length === 0) {
      setTradeError("Pick at least one Pokémon from each side.");
      return;
    }
    setProposing(true);
    setTradeError("");
    const res = await fetch(`/api/friends/${friendshipId}/trade`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ offeredInstanceIds: myOffered, requestedInstanceIds: requested }),
    });
    const data = await res.json();
    setProposing(false);
    if (data.error) return setTradeError(data.error);
    setMyOffered([]);
    setRequested([]);
    setShowBuilder(false);
    refreshTrades();
  }

  async function resolveTrade(tradeId: string, action: "accept" | "decline") {
    setBusyTradeId(tradeId);
    const res = await fetch(`/api/friends/trade/${tradeId}/${action}`, { method: "POST" });
    const data = await res.json();
    setBusyTradeId(null);
    if (data.error) {
      setTradeError(data.error);
      return;
    }
    refreshTrades();
  }

  return (
    <>
      <p><Link href="/friends">← Back to Friends</Link></p>

      <div className="card">
        <CardTab icon="🔄" label="Trades" />
        {tradeError && <p className="auth-error">{tradeError}</p>}

        {trades.length === 0 && !showBuilder && <p>No pending trades.</p>}

        {trades.map((t) => (
          <div key={t.id} className="trade-row">
            <div className="trade-row-header">
              {t.isMine ? "You proposed:" : `${friendDisplayName} proposed:`}
            </div>
            <div className="trade-row-pokemon">
              <div className="trade-row-side">
                <h4>{t.isMine ? "You give" : `${friendDisplayName} gives`}</h4>
                <TradeSideCards pokemon={t.offered} />
              </div>
              <div className="trade-row-arrow">⇄</div>
              <div className="trade-row-side">
                <h4>{t.isMine ? `${friendDisplayName} gives` : "You give"}</h4>
                <TradeSideCards pokemon={t.requested} />
              </div>
            </div>
            <div className="trade-row-actions">
              {t.isMine ? (
                <button className="btn-secondary" disabled={busyTradeId === t.id} onClick={() => resolveTrade(t.id, "decline")}>
                  Cancel
                </button>
              ) : (
                <>
                  <button className="btn-primary" disabled={busyTradeId === t.id} onClick={() => resolveTrade(t.id, "accept")}>
                    Accept
                  </button>
                  <button className="btn-secondary" disabled={busyTradeId === t.id} onClick={() => resolveTrade(t.id, "decline")}>
                    Decline
                  </button>
                </>
              )}
            </div>
          </div>
        ))}

        {!showBuilder ? (
          <button className="btn-primary" onClick={() => setShowBuilder(true)}>➕ Propose Trade</button>
        ) : (
          <div className="trade-builder">
            <h3>Your Pokémon ({myOffered.length} selected)</h3>
            <PokemonMultiPicker
              inventory={myInventory}
              typesList={typesList}
              selected={myOffered}
              onToggle={toggleOffered}
              emptyMessage="You don't own any Pokémon yet."
            />
            <h3>{friendDisplayName}&apos;s Pokémon ({requested.length} selected)</h3>
            <PokemonMultiPicker
              inventory={friendInventory}
              typesList={typesList}
              selected={requested}
              onToggle={toggleRequested}
              emptyMessage={`${friendDisplayName} doesn't own any Pokémon yet.`}
            />
            <div className="trade-builder-actions">
              <button className="btn-primary" disabled={proposing} onClick={proposeTrade}>
                {proposing ? "Proposing…" : "Send Trade Offer"}
              </button>
              <button className="btn-secondary" onClick={() => { setShowBuilder(false); setMyOffered([]); setRequested([]); setTradeError(""); }}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      <ChatPanel messages={messages} onSend={sendMessage} />
    </>
  );
}
