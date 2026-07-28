"use client";

import { usePathname } from "next/navigation";
import { MessageCircleQuestionMark } from "lucide-react";

const WHATSAPP = "https://wa.me/5548992084726";

/** A landing já tem o próprio botão de WhatsApp, e no login ele só atrapalha. */
const HIDDEN_ON = ["/", "/landing", "/login", "/signup"];

/**
 * Fica acima da barra de abas e é translúcido de propósito: o usuário precisa
 * enxergar o conteúdo que passa por baixo enquanto rola.
 */
export default function HelpFab() {
  const pathname = usePathname();
  if (HIDDEN_ON.includes(pathname)) return null;

  return (
    <a
      href={WHATSAPP}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Falar com o suporte no WhatsApp"
      title="Ajuda no WhatsApp"
      className="glass-strong text-foreground fixed right-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-40 flex size-12 items-center justify-center rounded-full transition-transform active:scale-95"
    >
      <MessageCircleQuestionMark aria-hidden className="size-5" />
    </a>
  );
}
