"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { createClient } from "@/utils/supabase/client";
import { sendMessage } from "@/app/matches/actions";
import type { Message } from "@/types/database";

export default function Chat({
  matchId,
  currentUserId,
  initialMessages,
}: {
  matchId: string;
  currentUserId: string;
  initialMessages: Message[];
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const formRef = useRef<HTMLFormElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`match-${matchId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          const newMessage = payload.new as Message;
          setMessages((current) =>
            current.some((m) => m.id === newMessage.id)
              ? current
              : [...current, newMessage]
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="flex h-[28rem] flex-col rounded-2xl border border-black/10 dark:border-white/10"
    >
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="text-sm text-neutral-500">
            Nenhuma mensagem ainda. Combine os detalhes da entrega por aqui.
          </p>
        )}
        <AnimatePresence initial={false}>
          {messages.map((m) => (
            <motion.div
              key={m.id}
              layout
              initial={{ opacity: 0, y: 10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                m.sender_id === currentUserId
                  ? "ml-auto bg-brand text-brand-foreground"
                  : "bg-black/5 dark:bg-white/10"
              }`}
            >
              {m.content}
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>
      <form
        ref={formRef}
        action={async (formData) => {
          formRef.current?.reset();
          await sendMessage(formData);
        }}
        className="flex gap-2 border-t border-black/10 p-3 dark:border-white/10"
      >
        <input type="hidden" name="match_id" value={matchId} />
        <input
          name="content"
          placeholder="Escreva uma mensagem..."
          required
          className="flex-1 rounded-full border border-black/10 bg-transparent px-4 py-2 text-sm outline-none focus:border-brand-ink dark:border-white/20"
        />
        <motion.button
          type="submit"
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.95 }}
          className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-brand-foreground hover:bg-brand-strong"
        >
          Enviar
        </motion.button>
      </form>
    </motion.div>
  );
}
