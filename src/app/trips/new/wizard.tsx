"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useFormStatus } from "react-dom";
import {
  Apple,
  Calendar,
  CheckCircle2,
  ChevronRight,
  PlaneLanding,
  PlaneTakeoff,
  Weight,
} from "lucide-react";
import { createTrip } from "../actions";
import { citiesMatch } from "@/lib/utils/cities";

/**
 * Airports offered in the picker.
 *
 * `city` and `state` are what actually reach the database — `trips` stores free
 * text cities, not IATA codes, and every search and match in the app compares
 * cities. Storing "GRU" would have made a trip from Guarulhos invisible to
 * someone searching "São Paulo".
 */
const AIRPORTS = [
  { code: "GRU", label: "GRU — Guarulhos, São Paulo", city: "São Paulo", state: "SP" },
  { code: "CGH", label: "CGH — Congonhas, São Paulo", city: "São Paulo", state: "SP" },
  { code: "SDU", label: "SDU — Santos Dumont, Rio de Janeiro", city: "Rio de Janeiro", state: "RJ" },
  { code: "GIG", label: "GIG — Galeão, Rio de Janeiro", city: "Rio de Janeiro", state: "RJ" },
  { code: "BSB", label: "BSB — Brasília", city: "Brasília", state: "DF" },
  { code: "CNF", label: "CNF — Confins, Belo Horizonte", city: "Belo Horizonte", state: "MG" },
  { code: "POA", label: "POA — Salgado Filho, Porto Alegre", city: "Porto Alegre", state: "RS" },
  { code: "FLN", label: "FLN — Hercílio Luz, Florianópolis", city: "Florianópolis", state: "SC" },
  { code: "CWB", label: "CWB — Afonso Pena, Curitiba", city: "Curitiba", state: "PR" },
  { code: "SSA", label: "SSA — Deputado Magalhães, Salvador", city: "Salvador", state: "BA" },
  { code: "REC", label: "REC — Guararapes, Recife", city: "Recife", state: "PE" },
  { code: "FOR", label: "FOR — Pinto Martins, Fortaleza", city: "Fortaleza", state: "CE" },
  { code: "SLZ", label: "SLZ — Mal. Cunha Machado, São Luís", city: "São Luís", state: "MA" },
  { code: "BEL", label: "BEL — Val-de-Cans, Belém", city: "Belém", state: "PA" },
  { code: "MAO", label: "MAO — Eduardo Gomes, Manaus", city: "Manaus", state: "AM" },
] as const;

/** Sentinel for "not in the list" — reveals a free-text city field. */
const OTHER = "OUTRO";

const WEIGHT_OPTIONS = [
  { kg: 5, label: "5 kg", desc: "Itens pequenos" },
  { kg: 10, label: "10 kg", desc: "Mala de mão cheia" },
  { kg: 23, label: "23 kg", desc: "Mala despachada" },
] as const;

type Place = { city: string; state: string };

function resolvePlace(code: string, freeText: string): Place {
  if (code === OTHER) return { city: freeText.trim(), state: "" };
  const airport = AIRPORTS.find((a) => a.code === code);
  return airport ? { city: airport.city, state: airport.state } : { city: "", state: "" };
}

/** Today as yyyy-mm-dd in the browser's timezone, for the date input's `min`. */
function todayISO(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

const variants = {
  enter: { x: 50, opacity: 0 },
  center: { zIndex: 1, x: 0, opacity: 1 },
  exit: { zIndex: 0, x: -50, opacity: 0 },
};

/**
 * Publishes a trip.
 *
 * This used to be a four-step wizard whose last screen said "Voo Cadastrado!"
 * without ever talking to the server — the traveler filled everything in, saw a
 * green check, and no row was written. Step 4 is now a review screen that posts
 * to the `createTrip` server action, and the success page is the trip itself.
 */
export default function NewTripWizard({ error }: { error?: string }) {
  const [step, setStep] = useState(1);

  const [originCode, setOriginCode] = useState("");
  const [originOther, setOriginOther] = useState("");
  const [destinationCode, setDestinationCode] = useState("");
  const [destinationOther, setDestinationOther] = useState("");
  const [date, setDate] = useState("");
  const [weightKg, setWeightKg] = useState<number | null>(null);
  const [acceptsPerishables, setAcceptsPerishables] = useState(false);
  const [notes, setNotes] = useState("");

  const origin = resolvePlace(originCode, originOther);
  const destination = resolvePlace(destinationCode, destinationOther);

  // Mirrors the server-side refine in createTripSchema, so the traveler finds
  // out on the screen where they picked the airports rather than after
  // filling in three more steps.
  const sameCity = citiesMatch(origin.city, destination.city);
  const routeReady =
    origin.city.length >= 2 && destination.city.length >= 2 && !sameCity;

  const next = () => setStep((s) => Math.min(4, s + 1));
  const back = () => setStep((s) => Math.max(1, s - 1));

  // Everything the traveler chose, flattened into what the action expects.
  const notesForSubmit = [
    acceptsPerishables ? "Aceito transportar alimentos perecíveis dentro das regras da ANAC." : "",
    notes.trim(),
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <div className="w-full max-w-xl">
      {/* Progresso */}
      <div className="mb-8">
        <div className="mb-2 flex justify-between">
          <span className="text-muted-foreground text-xs font-medium">
            Passo {step} de 4
          </span>
          <span className="text-brand-ink text-xs font-medium">
            {Math.round((step / 4) * 100)}%
          </span>
        </div>
        <div className="glass-weak h-1.5 w-full overflow-hidden rounded-full">
          <motion.div
            className="bg-brand h-full rounded-full"
            initial={{ width: "25%" }}
            animate={{ width: `${(step / 4) * 100}%` }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          />
        </div>
      </div>

      {error && (
        <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950/60 dark:text-red-300">
          {error}
        </p>
      )}

      <div className="glass relative flex min-h-[480px] flex-col overflow-hidden rounded-[2rem] p-8 sm:p-12">
        <AnimatePresence mode="wait">
          {/* ---------------------------------------------------- passo 1 */}
          {step === 1 && (
            <Step key="step1">
              <h2 className="mb-2 text-3xl font-black tracking-tight">Qual a sua rota?</h2>
              <p className="text-muted-foreground mb-8">
                Informe de onde você sai e para onde você vai.
              </p>

              <div className="flex-1 space-y-6">
                <PlacePicker
                  icon={<PlaneTakeoff className="text-brand-ink size-4" />}
                  label="Aeroporto de origem"
                  placeholder="Selecione a origem"
                  code={originCode}
                  onCode={setOriginCode}
                  freeText={originOther}
                  onFreeText={setOriginOther}
                />
                <PlacePicker
                  icon={<PlaneLanding className="text-brand-ink size-4" />}
                  label="Aeroporto de destino"
                  placeholder="Selecione o destino"
                  code={destinationCode}
                  onCode={setDestinationCode}
                  freeText={destinationOther}
                  onFreeText={setDestinationOther}
                />

                {sameCity && (
                  <p className="text-sm font-medium text-red-600 dark:text-red-400">
                    Origem e destino são a mesma cidade. GRU e CGH, por exemplo,
                    são os dois São Paulo.
                  </p>
                )}
              </div>

              <NextButton onClick={next} disabled={!routeReady}>
                Continuar
              </NextButton>
            </Step>
          )}

          {/* ---------------------------------------------------- passo 2 */}
          {step === 2 && (
            <Step key="step2">
              <h2 className="mb-2 text-3xl font-black tracking-tight">Detalhes do voo</h2>
              <p className="text-muted-foreground mb-8">
                Quando você voa e quanto espaço tem sobrando?
              </p>

              <div className="flex-1 space-y-6">
                <div>
                  <label className="mb-2 flex items-center gap-2 text-sm font-semibold">
                    <Calendar className="text-brand-ink size-4" />
                    Data do voo
                  </label>
                  <input
                    type="date"
                    value={date}
                    min={todayISO()}
                    onChange={(e) => setDate(e.target.value)}
                    className="glass-weak focus:border-brand-ink w-full rounded-xl px-4 py-3 outline-none"
                  />
                </div>

                <div>
                  <span className="mb-3 flex items-center gap-2 text-sm font-semibold">
                    <Weight className="text-brand-ink size-4" />
                    Espaço disponível na bagagem
                  </span>
                  <div className="grid grid-cols-3 gap-3">
                    {WEIGHT_OPTIONS.map((opt) => (
                      <button
                        key={opt.kg}
                        type="button"
                        aria-pressed={weightKg === opt.kg}
                        onClick={() => setWeightKg(opt.kg)}
                        className={`rounded-xl border-2 p-3 text-center transition-all ${
                          weightKg === opt.kg
                            ? "border-brand bg-brand-soft dark:bg-brand/10"
                            : "hover:border-brand border-neutral-200 dark:border-neutral-800"
                        }`}
                      >
                        <span
                          className={`block text-lg font-black ${
                            weightKg === opt.kg ? "text-brand-ink" : ""
                          }`}
                        >
                          {opt.label}
                        </span>
                        <span className="text-muted-foreground mt-1 block text-[10px] leading-tight">
                          {opt.desc}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <StepNav onBack={back} onNext={next} disabled={!date || !weightKg}>
                Continuar
              </StepNav>
            </Step>
          )}

          {/* ---------------------------------------------------- passo 3 */}
          {step === 3 && (
            <Step key="step3">
              <h2 className="mb-2 text-3xl font-black tracking-tight">Preferências</h2>
              <p className="text-muted-foreground mb-8">
                Defina o que você está disposto a transportar.
              </p>

              <div className="flex-1 space-y-4">
                <button
                  type="button"
                  aria-pressed={acceptsPerishables}
                  onClick={() => setAcceptsPerishables((v) => !v)}
                  className={`flex w-full items-start gap-4 rounded-2xl border-2 p-5 text-left transition-all ${
                    acceptsPerishables
                      ? "border-brand bg-brand-soft dark:bg-brand/10"
                      : "hover:border-brand border-neutral-200 dark:border-neutral-800"
                  }`}
                >
                  <span
                    className={`mt-1 rounded-full p-2 ${
                      acceptsPerishables
                        ? "bg-brand-soft dark:bg-brand/20 text-brand-ink"
                        : "glass-weak text-muted-foreground"
                    }`}
                  >
                    <Apple className="size-5" />
                  </span>
                  <span className="flex-1">
                    <span className="mb-1 flex items-center justify-between font-bold">
                      Alimentos perecíveis
                      <span
                        className={`flex size-5 items-center justify-center rounded-full ${
                          acceptsPerishables
                            ? "bg-brand"
                            : "bg-neutral-200 dark:bg-neutral-700"
                        }`}
                      >
                        {acceptsPerishables && (
                          <CheckCircle2 className="text-brand-foreground size-3" />
                        )}
                      </span>
                    </span>
                    <span className="text-muted-foreground block text-sm leading-relaxed">
                      Aceito transportar alimentos, queijos ou doces desde que
                      estejam dentro das regras da ANAC e do aeroporto. Isso
                      aumenta muito suas chances de match.
                    </span>
                  </span>
                </button>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold">
                    Observações{" "}
                    <span className="text-muted-foreground font-normal">(opcional)</span>
                  </span>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    maxLength={1000}
                    placeholder="Ex.: só levo itens que caibam na mala de mão, retirada perto do metrô…"
                    className="glass-weak focus:border-brand-ink w-full resize-none rounded-xl px-4 py-3 text-base outline-none"
                  />
                </label>
              </div>

              <StepNav onBack={back} onNext={next}>
                Revisar
              </StepNav>
            </Step>
          )}

          {/* ---------------------------------------------------- passo 4 */}
          {step === 4 && (
            <Step key="step4">
              <h2 className="mb-2 text-3xl font-black tracking-tight">Confirme e publique</h2>
              <p className="text-muted-foreground mb-8">
                Confira os dados. Depois de publicar, sua viagem aparece para quem
                precisa enviar algo nessa rota.
              </p>

              <dl className="glass-weak flex-1 space-y-3 rounded-2xl p-5 text-sm">
                <Row label="Rota">
                  {origin.city} → {destination.city}
                </Row>
                <Row label="Data do voo">
                  {date ? date.split("-").reverse().join("/") : "—"}
                </Row>
                <Row label="Espaço disponível">{weightKg ? `${weightKg} kg` : "—"}</Row>
                <Row label="Perecíveis">{acceptsPerishables ? "Aceito" : "Não aceito"}</Row>
                {notes.trim() && <Row label="Observações">{notes.trim()}</Row>}
              </dl>

              <form action={createTrip} className="mt-auto pt-6">
                <input type="hidden" name="origin_city" value={origin.city} />
                <input type="hidden" name="origin_state" value={origin.state} />
                <input type="hidden" name="destination_city" value={destination.city} />
                <input type="hidden" name="destination_state" value={destination.state} />
                <input type="hidden" name="departure_date" value={date} />
                <input
                  type="hidden"
                  name="available_space_kg"
                  value={weightKg ?? ""}
                />
                <input type="hidden" name="notes" value={notesForSubmit} />

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={back}
                    className="glass-weak rounded-xl px-6 py-4 font-medium transition-colors"
                  >
                    Voltar
                  </button>
                  <SubmitButton />
                </div>
              </form>
            </Step>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function Step({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      variants={variants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="flex flex-1 flex-col"
    >
      {children}
    </motion.div>
  );
}

function PlacePicker({
  icon,
  label,
  placeholder,
  code,
  onCode,
  freeText,
  onFreeText,
}: {
  icon: React.ReactNode;
  label: string;
  placeholder: string;
  code: string;
  onCode: (v: string) => void;
  freeText: string;
  onFreeText: (v: string) => void;
}) {
  return (
    <div>
      <label className="mb-2 flex items-center gap-2 text-sm font-semibold">
        {icon}
        {label}
      </label>
      <select
        value={code}
        onChange={(e) => onCode(e.target.value)}
        className="glass-weak focus:border-brand-ink w-full appearance-none rounded-xl px-4 py-3 outline-none"
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {AIRPORTS.map((a) => (
          <option key={a.code} value={a.code}>
            {a.label}
          </option>
        ))}
        <option value={OTHER}>Outra cidade…</option>
      </select>
      {code === OTHER && (
        <input
          value={freeText}
          onChange={(e) => onFreeText(e.target.value)}
          placeholder="Digite a cidade"
          autoComplete="off"
          className="glass-weak focus:border-brand-ink mt-3 w-full rounded-xl px-4 py-3 text-base outline-none"
        />
      )}
    </div>
  );
}

function NextButton({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="mt-auto flex w-full items-center justify-center gap-2 rounded-xl bg-black py-4 font-semibold text-white transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-black"
    >
      {children} <ChevronRight className="size-4" />
    </button>
  );
}

function StepNav({
  onBack,
  onNext,
  disabled,
  children,
}: {
  onBack: () => void;
  onNext: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-auto flex gap-3 pt-6">
      <button
        type="button"
        onClick={onBack}
        className="glass-weak rounded-xl px-6 py-4 font-medium transition-colors"
      >
        Voltar
      </button>
      <button
        type="button"
        onClick={onNext}
        disabled={disabled}
        className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-black py-4 font-semibold text-white transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-black"
      >
        {children} <ChevronRight className="size-4" />
      </button>
    </div>
  );
}

/**
 * Separate component because `useFormStatus` only reports the status of a form
 * rendered *above* it in the tree — called in the same component as the
 * `<form>`, it always returns pending: false.
 */
function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-brand hover:bg-brand-strong text-brand-foreground flex-1 rounded-xl py-4 font-bold transition-colors disabled:opacity-60"
    >
      {pending ? "Publicando…" : "Publicar viagem"}
    </button>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground shrink-0">{label}</dt>
      <dd className="text-right font-semibold">{children}</dd>
    </div>
  );
}
