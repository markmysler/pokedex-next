"use client";

import { useCallback, useEffect, useState } from "react";
import type { OwnedPokemon } from "@/types/pokemon";
import { getSupabaseBrowserClient } from "@/lib/supabase/browserClient";
import { useDictionary } from "@/lib/i18n/useDictionary";
import ChatPanel, { type ChatMessage } from "@/components/online/ChatPanel";
import PokemonMultiPicker from "@/components/pokemon/PokemonMultiPicker";
import PokemonInstanceCard from "@/components/inventory/PokemonInstanceCard";
import Modal from "@/components/ui/Modal";
import Icon from "@/components/ui/Icon";

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
    <div className="trade-side-cards">
      {pokemon.map((p) => (
        <PokemonInstanceCard key={p.id} pokemon={p} variant="grid" compact selected={false} onSelect={noop} />
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
  const dict = useDictionary();
  const t = dict.social.chat;
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
      .channel(`friendship:${friendshipId}`, { config: { private: true } })
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
    setMessages((prev) => [...prev, { text, senderDisplayName: dict.battle.chat.you, mine: true }]);
    const res = await fetch(`/api/friends/${friendshipId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    const data = await res.json();
    if (data.error) {
      setMessages((prev) => [...prev, { text: t.messageFailed(data.error), senderDisplayName: t.systemSender, mine: false }]);
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
      setTradeError(t.pickAtLeastOne);
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

  function closeBuilder() {
    setShowBuilder(false);
    setMyOffered([]);
    setRequested([]);
    setTradeError("");
  }

  const offeredPokemon = myOffered.map((id) => myInventory.find((p) => p.id === id)).filter((p): p is OwnedPokemon => Boolean(p));
  const requestedPokemon = requested.map((id) => friendInventory.find((p) => p.id === id)).filter((p): p is OwnedPokemon => Boolean(p));

  return (
    <div className="chat-layout">
      <ChatPanel messages={messages} onSend={sendMessage} />

      <section className="panel trades-panel">
        <div className="panel-head">
          <h2>{t.trades}</h2>
          <button className="btn-primary btn-sm" onClick={() => setShowBuilder(true)}>
            <Icon name="swap" size={14} /> {t.proposeTrade}
          </button>
        </div>
        {tradeError && !showBuilder && <p className="alert alert-error" role="alert">{tradeError}</p>}
        {trades.length === 0 && <p className="empty">{t.noPendingTrades}</p>}
        <div className="stack">
          {trades.map((trade) => (
            <article key={trade.id} className="trade-offer">
              <span className="eyebrow">{trade.isMine ? t.youProposed : t.friendProposed(friendDisplayName)}</span>
              <div className="trade-sides">
                <div className="stack" style={{ gap: 6 }}>
                  <span className="small muted">{trade.isMine ? t.youGive : t.friendGives(friendDisplayName)}</span>
                  <TradeSideCards pokemon={trade.offered} />
                </div>
                <Icon name="swap" className="trade-arrow" />
                <div className="stack" style={{ gap: 6 }}>
                  <span className="small muted">{trade.isMine ? t.friendGives(friendDisplayName) : t.youGive}</span>
                  <TradeSideCards pokemon={trade.requested} />
                </div>
              </div>
              <div className="row">
                {trade.isMine ? (
                  <button className="btn-ghost btn-sm" disabled={busyTradeId === trade.id} onClick={() => resolveTrade(trade.id, "decline")}>{t.cancelOffer}</button>
                ) : (
                  <>
                    <button className="btn-primary btn-sm" disabled={busyTradeId === trade.id} onClick={() => resolveTrade(trade.id, "accept")}>{t.accept}</button>
                    <button className="btn-ghost btn-sm" disabled={busyTradeId === trade.id} onClick={() => resolveTrade(trade.id, "decline")}>{t.decline}</button>
                  </>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>

      {showBuilder && (
        <Modal onClose={() => (proposing ? null : closeBuilder())} size="xl">
          <h2>{t.builderTitle}</h2>
          <div className="trade-builder">
            <div className="stack" style={{ gap: 8 }}>
              <h3 className="eyebrow">{t.yourPokemonSelected(myOffered.length)}</h3>
              <div className="trade-tray">
                {offeredPokemon.length === 0 ? <span className="small faint">{t.nothingPicked}</span> : <TradeSideCards pokemon={offeredPokemon} />}
              </div>
              <PokemonMultiPicker inventory={myInventory} typesList={typesList} selected={myOffered} onToggle={toggleOffered} emptyMessage={t.noOwnedPokemon} />
            </div>
            <Icon name="swap" className="trade-arrow trade-builder-arrow" size={22} />
            <div className="stack" style={{ gap: 8 }}>
              <h3 className="eyebrow">{t.friendPokemonSelected(friendDisplayName, requested.length)}</h3>
              <div className="trade-tray">
                {requestedPokemon.length === 0 ? <span className="small faint">{t.nothingPicked}</span> : <TradeSideCards pokemon={requestedPokemon} />}
              </div>
              <PokemonMultiPicker inventory={friendInventory} typesList={typesList} selected={requested} onToggle={toggleRequested} emptyMessage={t.friendNoOwnedPokemon(friendDisplayName)} />
            </div>
          </div>
          {tradeError && <p className="alert alert-error" role="alert">{tradeError}</p>}
          <div className="dialog-actions">
            <button className="btn-ghost" onClick={closeBuilder} disabled={proposing}>{dict.common.cancel}</button>
            <button className="btn-primary" disabled={proposing || myOffered.length === 0 || requested.length === 0} onClick={proposeTrade}>
              {proposing ? t.proposing : t.sendTradeOffer}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
