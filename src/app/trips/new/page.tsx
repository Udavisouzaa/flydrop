"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { ArrowLeft, PlaneTakeoff, PlaneLanding, Calendar, Weight, Apple, CheckCircle2, ChevronRight } from "lucide-react";

const AIRPORTS = [
  { code: "GRU", name: "Guarulhos, São Paulo" },
  { code: "CGH", name: "Congonhas, São Paulo" },
  { code: "SDU", name: "Santos Dumont, Rio de Janeiro" },
  { code: "GIG", name: "Galeão, Rio de Janeiro" },
  { code: "BSB", name: "Brasília, Distrito Federal" },
  { code: "CNF", name: "Confins, Belo Horizonte" },
  { code: "POA", name: "Salgado Filho, Porto Alegre" },
  { code: "FLN", name: "Hercílio Luz, Florianópolis" },
  { code: "SLZ", name: "Mal. Cunha Machado, São Luís" },
  { code: "BEL", name: "Val-de-Cans, Belém" },
  { code: "IOP", name: "IOM, Outro" },
];

const WEIGHT_OPTIONS = [
  { id: "5kg", label: "Até 5kg", desc: "Itens pequenos" },
  { id: "10kg", label: "Até 10kg", desc: "Mala de mão cheia" },
  { id: "23kg", label: "Até 23kg", desc: "Mala despachada" },
];

export default function NewTripPage() {
  const [step, setStep] = useState(1);
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [date, setDate] = useState("");
  const [weight, setWeight] = useState("");
  const [acceptsPerishables, setAcceptsPerishables] = useState(false);

  const nextStep = () => setStep((s) => s + 1);
  const prevStep = () => setStep((s) => Math.max(1, s - 1));

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 50 : -50,
      opacity: 0,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? -50 : 50,
      opacity: 0,
    }),
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-black dark:text-white flex flex-col">
      {/* Header Minimalista */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-black/5 dark:border-white/5">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="p-2 rounded-full bg-neutral-100 dark:bg-neutral-900 group-hover:bg-neutral-200 dark:group-hover:bg-neutral-800 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </div>
          <span className="font-semibold text-sm">Voltar ao início</span>
        </Link>
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-full bg-orange-500" />
          <span className="font-bold tracking-tight">flydrop.</span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-xl">
          
          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex justify-between mb-2">
              <span className="text-xs font-medium text-neutral-500">Passo {step} de 4</span>
              <span className="text-xs font-medium text-orange-500">{Math.round((step / 4) * 100)}%</span>
            </div>
            <div className="h-1.5 w-full bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-orange-500 rounded-full"
                initial={{ width: "25%" }}
                animate={{ width: `${(step / 4) * 100}%` }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
              />
            </div>
          </div>

          <div className="relative overflow-hidden bg-white dark:bg-neutral-900 rounded-[2rem] shadow-xl border border-black/5 dark:border-white/5 p-8 sm:p-12 min-h-[480px] flex flex-col">
            <AnimatePresence mode="wait" custom={1}>
              {/* Passo 1: Aeroportos */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  custom={1}
                  variants={variants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  className="flex-1 flex flex-col"
                >
                  <h2 className="text-3xl font-black tracking-tight mb-2">Qual a sua rota?</h2>
                  <p className="text-neutral-500 mb-8">Informe de onde você sai e para onde você vai.</p>

                  <div className="space-y-6 flex-1">
                    <div>
                      <label className="flex items-center gap-2 text-sm font-semibold mb-2">
                        <PlaneTakeoff className="w-4 h-4 text-orange-500" />
                        Aeroporto de Origem
                      </label>
                      <select 
                        value={origin}
                        onChange={(e) => setOrigin(e.target.value)}
                        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-3 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all appearance-none"
                      >
                        <option value="" disabled>Selecione a origem</option>
                        {AIRPORTS.map(a => <option key={a.code} value={a.code}>{a.code} - {a.name}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="flex items-center gap-2 text-sm font-semibold mb-2">
                        <PlaneLanding className="w-4 h-4 text-orange-500" />
                        Aeroporto de Destino
                      </label>
                      <select 
                        value={destination}
                        onChange={(e) => setDestination(e.target.value)}
                        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-3 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all appearance-none"
                      >
                        <option value="" disabled>Selecione o destino</option>
                        {AIRPORTS.map(a => <option key={a.code} value={a.code}>{a.code} - {a.name}</option>)}
                      </select>
                    </div>
                  </div>

                  <button 
                    onClick={nextStep}
                    disabled={!origin || !destination}
                    className="mt-auto w-full bg-black dark:bg-white text-white dark:text-black font-semibold rounded-xl py-4 flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    Continuar <ChevronRight className="w-4 h-4" />
                  </button>
                </motion.div>
              )}

              {/* Passo 2: Data e Peso */}
              {step === 2 && (
                <motion.div
                  key="step2"
                  custom={1}
                  variants={variants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  className="flex-1 flex flex-col"
                >
                  <h2 className="text-3xl font-black tracking-tight mb-2">Detalhes do Voo</h2>
                  <p className="text-neutral-500 mb-8">Quando você voa e quanto espaço tem sobrando?</p>

                  <div className="space-y-6 flex-1">
                    <div>
                      <label className="flex items-center gap-2 text-sm font-semibold mb-2">
                        <Calendar className="w-4 h-4 text-orange-500" />
                        Data do Voo
                      </label>
                      <input 
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-3 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
                      />
                    </div>

                    <div>
                      <label className="flex items-center gap-2 text-sm font-semibold mb-3">
                        <Weight className="w-4 h-4 text-orange-500" />
                        Espaço Disponível na Bagagem
                      </label>
                      <div className="grid grid-cols-3 gap-3">
                        {WEIGHT_OPTIONS.map((opt) => (
                          <div 
                            key={opt.id}
                            onClick={() => setWeight(opt.id)}
                            className={`cursor-pointer rounded-xl border-2 p-3 text-center transition-all ${
                              weight === opt.id 
                                ? "border-orange-500 bg-orange-50 dark:bg-orange-500/10" 
                                : "border-neutral-200 dark:border-neutral-800 hover:border-orange-200"
                            }`}
                          >
                            <div className={`font-black text-lg ${weight === opt.id ? "text-orange-500" : ""}`}>{opt.id}</div>
                            <div className="text-[10px] text-neutral-500 mt-1 leading-tight">{opt.desc}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 mt-auto pt-6">
                    <button 
                      onClick={prevStep}
                      className="px-6 py-4 rounded-xl bg-neutral-100 dark:bg-neutral-800 font-medium hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                    >
                      Voltar
                    </button>
                    <button 
                      onClick={nextStep}
                      disabled={!date || !weight}
                      className="flex-1 bg-black dark:bg-white text-white dark:text-black font-semibold rounded-xl py-4 flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      Continuar <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Passo 3: Restrições & Perecíveis */}
              {step === 3 && (
                <motion.div
                  key="step3"
                  custom={1}
                  variants={variants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  className="flex-1 flex flex-col"
                >
                  <h2 className="text-3xl font-black tracking-tight mb-2">Preferências</h2>
                  <p className="text-neutral-500 mb-8">Defina o que você está disposto a transportar.</p>

                  <div className="space-y-4 flex-1">
                    <div 
                      onClick={() => setAcceptsPerishables(!acceptsPerishables)}
                      className={`cursor-pointer border-2 rounded-2xl p-5 flex items-start gap-4 transition-all ${
                        acceptsPerishables ? "border-orange-500 bg-orange-50 dark:bg-orange-500/10" : "border-neutral-200 dark:border-neutral-800 hover:border-orange-200"
                      }`}
                    >
                      <div className={`p-2 rounded-full mt-1 ${acceptsPerishables ? "bg-orange-100 dark:bg-orange-500/20 text-orange-500" : "bg-neutral-100 dark:bg-neutral-800 text-neutral-400"}`}>
                        <Apple className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <div className="font-bold mb-1 flex items-center justify-between">
                          Alimentos Perecíveis
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center ${acceptsPerishables ? "bg-orange-500" : "bg-neutral-200 dark:bg-neutral-700"}`}>
                            {acceptsPerishables && <CheckCircle2 className="w-3 h-3 text-white" />}
                          </div>
                        </div>
                        <p className="text-sm text-neutral-500 leading-relaxed">
                          Aceito transportar alimentos, queijos ou doces desde que estejam dentro das regras da ANAC e do aeroporto. (Isto aumenta muito suas chances de match!)
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 mt-auto pt-6">
                    <button 
                      onClick={prevStep}
                      className="px-6 py-4 rounded-xl bg-neutral-100 dark:bg-neutral-800 font-medium hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                    >
                      Voltar
                    </button>
                    <button 
                      onClick={nextStep}
                      className="flex-1 bg-black dark:bg-white text-white dark:text-black font-semibold rounded-xl py-4 flex items-center justify-center gap-2 hover:opacity-90 transition-all"
                    >
                      Revisar <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Passo 4: Conclusão */}
              {step === 4 && (
                <motion.div
                  key="step4"
                  custom={1}
                  variants={variants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  className="flex-1 flex flex-col items-center justify-center text-center py-6"
                >
                  <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 text-green-500 rounded-full flex items-center justify-center mb-6">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <h2 className="text-3xl font-black tracking-tight mb-4">Voo Cadastrado!</h2>
                  <p className="text-neutral-500 mb-8 max-w-sm">
                    Tudo pronto! Seu voo de <strong className="text-black dark:text-white">{origin}</strong> para <strong className="text-black dark:text-white">{destination}</strong> no dia <strong className="text-black dark:text-white">{date.split('-').reverse().join('/')}</strong> está registrado.
                  </p>

                  <div className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-100 dark:border-neutral-800 rounded-2xl p-4 mb-8 text-left text-sm flex justify-between items-center">
                    <div>
                      <p className="text-neutral-500">Espaço disponibilizado:</p>
                      <p className="font-bold text-lg">{weight}</p>
                    </div>
                    {acceptsPerishables && (
                      <div className="bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                        <Apple className="w-3 h-3" /> Perecíveis OK
                      </div>
                    )}
                  </div>

                  <Link href="/" className="w-full">
                    <button className="w-full bg-orange-500 text-white font-bold rounded-xl py-4 hover:bg-orange-600 transition-colors">
                      Voltar ao Início
                    </button>
                  </Link>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
        </div>
      </main>
    </div>
  );
}
