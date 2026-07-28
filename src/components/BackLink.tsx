import Link from "next/link";
import { ChevronLeft } from "lucide-react";

/**
 * Telas de detalhe são abertas de dentro do app, mas também por link direto
 * (notificação, WhatsApp). Um Link para o pai funciona nos dois casos —
 * `router.back()` deixaria quem chegou de fora sem saída.
 */
export default function BackLink({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="text-muted-foreground hover:text-foreground -ml-1 mb-3 inline-flex items-center gap-1 text-sm font-medium"
    >
      <ChevronLeft aria-hidden className="size-4" />
      {label}
    </Link>
  );
}
