"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface PixCharge {
  payload: string;
  encodedImage?: string;
  expiresAt?: string | null;
}

/**
 * Paywall shown on an accepted-but-locked match: generates a Pix charge for
 * the connection fee and polls until the Asaas webhook flips
 * `matches.unlocked_at`, at which point the server component re-renders with
 * the contact info revealed.
 */
export default function ConnectionPaywall({
  matchId,
  connectionFee,
  otherName,
}: {
  matchId: string;
  connectionFee: number | null;
  otherName: string;
}) {
  const router = useRouter();
  const [charge, setCharge] = useState<PixCharge | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Once a QR is on screen, watch for the unlock instead of making the user
  // guess when to refresh. Give up after 10 minutes so we don't poll forever.
  useEffect(() => {
    if (!charge) return;

    const startedAt = Date.now();
    pollRef.current = setInterval(() => {
      if (Date.now() - startedAt > 10 * 60 * 1000) {
        if (pollRef.current) clearInterval(pollRef.current);
        return;
      }
      router.refresh();
    }, 5000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [charge, router]);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/connection/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ match_id: matchId }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data?.error ?? "Não foi possível gerar a cobrança");
        return;
      }
      setCharge(data as PixCharge);
    } catch {
      setError("Falha de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!charge?.payload) return;
    await navigator.clipboard.writeText(charge.payload);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-2xl border border-black/10 p-6 text-center dark:border-white/10">
      <p className="text-sm font-medium">Contato e chat bloqueados</p>
      <p className="mx-auto mt-2 max-w-sm text-sm text-neutral-500">
        Libere o WhatsApp de {otherName} e o chat pagando a taxa de conexão
        {connectionFee != null
          ? ` de R$ ${Number(connectionFee).toFixed(2)}`
          : ""}{" "}
        via Pix. Você paga uma vez por match — o valor da entrega vocês combinam
        direto entre si.
      </p>

      {!charge && (
        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading}
          className="mt-4 rounded-full bg-orange-500 px-6 py-2.5 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50"
        >
          {loading ? "Gerando Pix..." : "Pagar taxa de conexão"}
        </button>
      )}

      {error && (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {charge && (
        <div className="mt-5 space-y-3">
          {charge.encodedImage && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={`data:image/png;base64,${charge.encodedImage}`}
              alt="QR Code Pix para pagar a taxa de conexão"
              className="mx-auto h-48 w-48 rounded-lg bg-white p-2"
            />
          )}
          <button
            type="button"
            onClick={handleCopy}
            className="rounded-full border border-black/10 px-5 py-2 text-xs font-medium hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/5"
          >
            {copied ? "Código copiado!" : "Copiar código Pix (copia e cola)"}
          </button>
          <p className="text-xs text-neutral-500">
            Assim que o pagamento cair, o contato é liberado automaticamente
            nesta tela.
          </p>
        </div>
      )}
    </div>
  );
}
