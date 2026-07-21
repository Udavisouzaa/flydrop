"use client";

import { Canvas } from "@react-three/fiber";
import { Environment, ContactShadows } from "@react-three/drei";
import Suitcase3D from "@/components/Suitcase3D";
import Link from "next/link";
import { useRef } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useMotionValueEvent,
  useSpring,
  type MotionValue,
} from "motion/react";
import {
  Package,
  Plane,
  Search,
  Handshake,
  MapPin,
  ShieldCheck,
} from "lucide-react";

// Scroll progress zones (0 to 1) where each stage is fully visible.
// The suitcase video (10s) is scrubbed in lockstep with scroll across
// the whole [0,1] range, so these zones double as "which part of the
// video is on screen" markers.
const STAGES = {
  hero: [-0.1, 0, 0.12, 0.16],
  problema: [0.16, 0.22, 0.32, 0.38],
  como: [0.38, 0.44, 0.54, 0.60],
  comunicacao: [0.60, 0.66, 0.76, 0.82],
  personas: [0.82, 0.88, 0.94, 0.96],
  cta: [0.96, 0.98, 1, 1.1],
} as const;

import { Header } from "@/components/ui/header";

export default function Home() {
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  return (
    <div ref={containerRef} className="relative h-[600vh]">
      <Header />
      <div className="sticky top-0 h-screen w-full overflow-hidden bg-white dark:bg-black">
        <div className="absolute inset-0 z-0">
          <Canvas shadows camera={{ position: [0, 0, 8], fov: 40 }}>
            <ambientLight intensity={0.5} />
            <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
            <Environment preset="city" />
            <Suitcase3D progress={smoothProgress} />
            <ContactShadows position={[0, -3.5, 0]} opacity={0.4} scale={10} blur={2} far={4} />
          </Canvas>
        </div>

        <StageOverlay progress={smoothProgress} range={STAGES.hero} interactive align="right">
          <h1 className="mt-8 text-5xl font-black leading-[1.05] tracking-tighter sm:text-7xl lg:text-8xl">
            Sua bagagem <br className="hidden sm:block" />
            <span className="bg-gradient-to-r from-orange-500 to-orange-300 bg-clip-text text-transparent">
              agora tem valor.
            </span>
          </h1>
          <p className="mt-6 text-lg text-neutral-700 dark:text-neutral-300 md:max-w-xl md:ml-auto">
            O Flydrop conecta quem precisa de um produto de outra cidade com
            viajantes que têm espaço sobrando na mala.
          </p>
          <div className="mt-10 flex flex-col gap-4 sm:flex-row md:justify-end">
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
              <Link
                href="/orders/new"
                className="block rounded-full bg-orange-500 px-6 py-3 font-medium text-white hover:bg-orange-600"
              >
                Preciso de um produto
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
              <Link
                href="/trips/new"
                className="block rounded-full border border-black/10 bg-white/70 px-6 py-3 font-medium backdrop-blur hover:bg-white dark:border-white/20 dark:bg-black/40 dark:hover:bg-black/60"
              >
                Vou viajar, tenho espaço na mala
              </Link>
            </motion.div>
          </div>
          <p className="mt-16 animate-bounce text-xs text-neutral-500">
            Continue rolando ↓
          </p>
        </StageOverlay>

        <StageOverlay progress={smoothProgress} range={STAGES.problema} align="left">
          <h2 className="text-4xl font-black tracking-tight sm:text-6xl bg-gradient-to-br from-neutral-900 to-neutral-400 bg-clip-text text-transparent dark:from-white dark:to-neutral-500 pb-2">
            O problema
          </h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            <Panel>
              <h3 className="font-semibold text-orange-500">Compradores</h3>
              <p className="mt-2 text-sm text-neutral-700 dark:text-neutral-300">
                Fretes abusivos — às vezes mais caros que o produto —,
                restrições geográficas e demora excessiva dos Correios e
                transportadoras.
              </p>
            </Panel>
            <Panel>
              <h3 className="font-semibold text-orange-500">Viajantes</h3>
              <p className="mt-2 text-sm text-neutral-700 dark:text-neutral-300">
                Viajam com espaço sobrando na mala e não monetizam esse
                &ldquo;imóvel vazio&rdquo;.
              </p>
            </Panel>
          </div>
        </StageOverlay>

        <StageOverlay progress={smoothProgress} range={STAGES.como} align="left">
          <h2 className="text-4xl font-black tracking-tight sm:text-6xl bg-gradient-to-br from-neutral-900 to-neutral-400 bg-clip-text text-transparent dark:from-white dark:to-neutral-500 pb-2">
            Como funciona
          </h2>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Step
              icon={<Package className="h-5 w-5" />}
              title="1. Pedido"
              description="Cadastre o item e a rota."
            />
            <Step
              icon={<Plane className="h-5 w-5" />}
              title="2. Oferta"
              description="Viajantes cadastram a viagem."
            />
            <Step
              icon={<Search className="h-5 w-5" />}
              title="3. Match"
              description="A plataforma cruza as rotas."
            />
            <Step
              icon={<Handshake className="h-5 w-5" />}
              title="4. Entrega"
              description="Combinam e entregam com segurança."
            />
          </div>
        </StageOverlay>

        {/* ESTÁGIO NOVO: Comunicação Inteligente */}
        <StageOverlay progress={smoothProgress} range={STAGES.comunicacao} align="center">
          <div className="flex flex-col lg:flex-row items-center gap-12 text-left w-full">
            <div className="flex-1">
              <h2 className="text-4xl font-black tracking-tight sm:text-6xl bg-gradient-to-br from-neutral-900 to-neutral-400 bg-clip-text text-transparent dark:from-white dark:to-neutral-500 pb-2">
                Comunicação<br />Inteligente
              </h2>
              <p className="mt-6 text-xl text-neutral-600 dark:text-neutral-400 leading-relaxed">
                Você nunca fica no escuro. Nossa inteligência artificial monitora os voos em tempo real e atualiza você e o viajante sobre cada etapa do processo através do nosso assistente virtual.
              </p>
            </div>
            <div className="flex-1 flex justify-start pl-8 lg:pl-16">
              <SmartPhoneMockup />
            </div>
          </div>
        </StageOverlay>

        <StageOverlay progress={smoothProgress} range={STAGES.personas} align="left">
          <h2 className="text-4xl font-black tracking-tight sm:text-6xl bg-gradient-to-br from-neutral-900 to-neutral-400 bg-clip-text text-transparent dark:from-white dark:to-neutral-500 pb-2">
            Para quem é
          </h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            <Panel>
              <MapPin className="h-6 w-6 text-orange-500" />
              <h3 className="mt-3 font-semibold">O Solicitante</h3>
              <p className="mt-2 text-sm text-neutral-700 dark:text-neutral-300">
                Precisa enviar documentos urgentes, despachar um item esquecido na viagem ou receber uma encomenda no mesmo dia.
              </p>
            </Panel>
            <Panel>
              <ShieldCheck className="h-6 w-6 text-orange-500" />
              <h3 className="mt-3 font-semibold">O Viajante</h3>
              <p className="mt-2 text-sm text-neutral-700 dark:text-neutral-300">
                Cede espaço na mala em troca de uma renda extra.
              </p>
            </Panel>
          </div>
        </StageOverlay>

        <StageOverlay progress={smoothProgress} range={STAGES.cta} interactive align="right">
          <h2 className="text-4xl font-black sm:text-5xl md:max-w-xl md:ml-auto">
            Pronto para começar?
          </h2>
          <p className="mt-3 text-lg text-neutral-700 dark:text-neutral-300 md:max-w-xl md:ml-auto">
            Cadastre-se gratuitamente e encontre seu match de rota.
          </p>
          <motion.div
            className="mt-8 inline-block"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
          >
            <Link
              href="/signup"
              className="block rounded-full bg-orange-500 px-6 py-3 font-medium text-white hover:bg-orange-600"
            >
              Criar minha conta
            </Link>
          </motion.div>
        </StageOverlay>

        <motion.a
          href="https://wa.me/5548992084726"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Falar no WhatsApp"
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          className="absolute bottom-6 right-6 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.198.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.297-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
            <path d="M12.004 2.003c-5.514 0-9.997 4.483-9.997 9.997 0 1.762.464 3.484 1.345 4.997L2 22l5.116-1.334a9.96 9.96 0 004.888 1.24h.004c5.514 0 9.997-4.483 9.997-9.998 0-2.669-1.04-5.178-2.928-7.066a9.935 9.935 0 00-7.073-2.929zm0 18.166h-.003a8.164 8.164 0 01-4.166-1.14l-.299-.177-3.037.792.812-2.96-.194-.305a8.173 8.173 0 01-1.256-4.38c0-4.518 3.677-8.194 8.196-8.194a8.14 8.14 0 015.797 2.398 8.14 8.14 0 012.399 5.796c-.001 4.519-3.678 8.17-8.249 8.17z" />
          </svg>
        </motion.a>
      </div>
    </div>
  );
}

function StageOverlay({
  progress,
  range,
  interactive = false,
  align = "center",
  children,
}: {
  progress: MotionValue<number>;
  range: readonly [number, number, number, number];
  interactive?: boolean;
  align?: "left" | "center" | "right";
  children: React.ReactNode;
}) {
  const opacity = useTransform(progress, range as unknown as number[], [0, 1, 1, 0]);
  const y = useTransform(progress, range as unknown as number[], [24, 0, 0, -24]);
  const pointerEvents = useTransform(progress, range as unknown as number[], [
    "none",
    interactive ? "auto" : "none",
    interactive ? "auto" : "none",
    "none",
  ]);

  const alignClass = align === "left" ? "items-start text-left" : align === "right" ? "items-end text-right" : "items-center text-center";

  return (
    <motion.div
      style={{ opacity, y, pointerEvents }}
      className={`absolute inset-0 flex flex-col justify-center px-6 md:px-24 lg:px-32 ${alignClass}`}
    >
      <div className="w-full max-w-4xl">{children}</div>
    </motion.div>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-black/10 bg-white/80 p-8 text-left text-lg backdrop-blur dark:border-white/10 dark:bg-black/50 shadow-lg">
      {children}
    </div>
  );
}

function Step({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-3xl border border-black/10 bg-white/80 p-6 text-left backdrop-blur dark:border-white/10 dark:bg-black/50 shadow-lg">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-500/10 text-orange-500">
        {icon}
      </div>
      <h3 className="mt-4 text-base font-bold">{title}</h3>
      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
        {description}
      </p>
    </div>
  );
}

function SmartPhoneMockup() {
  return (
    <div className="relative w-64 rounded-[2rem] border-[6px] border-neutral-900 bg-white shadow-2xl dark:border-neutral-800 dark:bg-black overflow-hidden h-[450px] flex flex-col text-left">
      {/* Top bar (Header) */}
      <div className="bg-[#075e54] p-3 text-white flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-xs">🤖</div>
        <div>
          <div className="text-sm font-bold leading-tight">Flydrop Bot</div>
          <div className="text-[10px] opacity-80 leading-tight">online</div>
        </div>
      </div>
      
      {/* Chat Area */}
      <div className="flex-1 p-3 flex flex-col gap-3 bg-[#e5ddd5] dark:bg-[#0b141a] text-[11px] overflow-y-auto">
        {/* User Message */}
        <div className="self-end bg-[#dcf8c6] dark:bg-[#005c4b] p-2 rounded-lg rounded-tr-none max-w-[85%] shadow-sm text-black dark:text-white">
          Oi! O viajante já comprou meu iPhone?
        </div>
        
        {/* Bot Message */}
        <div className="self-start bg-white dark:bg-[#202c33] p-2 rounded-lg rounded-tl-none max-w-[85%] shadow-sm text-black dark:text-white">
          <p>Tudo certo! ✅</p>
          <p className="mt-1">O Matheus já está no aeroporto de GRU (Guarulhos).</p>
        </div>
        
        {/* AI Notification Alert */}
        <div className="self-center bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200 p-2.5 rounded-lg max-w-[95%] text-[10px] text-center mt-2 shadow-sm border border-yellow-200 dark:border-yellow-700/50">
          <span className="block font-bold mb-1">📍 Notificação Inteligente</span>
          O voo (LA3390) acabou de pousar. O Matheus chegou em sua cidade (POA) com o seu item!
        </div>
      </div>
      
      {/* Input area */}
      <div className="bg-[#f0f0f0] dark:bg-[#202c33] p-2 flex items-center gap-2">
        <div className="flex-1 bg-white dark:bg-[#2a3942] rounded-full h-8 px-3 flex items-center text-neutral-400 text-xs">
          Mensagem
        </div>
        <div className="w-8 h-8 rounded-full bg-[#128C7E] flex items-center justify-center text-white shrink-0">
          <svg className="w-3.5 h-3.5 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
        </div>
      </div>
    </div>
  );
}
