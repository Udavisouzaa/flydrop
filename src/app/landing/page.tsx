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

import { Header } from "@/components/ui/header";
import { LangProvider, useLang } from "@/lib/i18n";

// Scroll progress zones (0 to 1) where each stage is fully visible.
// The suitcase video (10s) is scrubbed in lockstep with scroll across
// the whole [0,1] range, so these zones double as "which part of the
// video is on screen" markers.
const STAGES = {
  hero: [-0.1, 0, 0.12, 0.16],
  problema: [0.16, 0.22, 0.32, 0.38],
  como: [0.38, 0.44, 0.54, 0.6],
  comunicacao: [0.6, 0.66, 0.76, 0.82],
  personas: [0.82, 0.88, 0.94, 0.96],
  cta: [0.96, 0.98, 1, 1.1],
} as const;

export default function Home() {
  return (
    <LangProvider>
      <Landing />
    </LangProvider>
  );
}

function Landing() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { t } = useLang();

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  return (
    <div ref={containerRef} className="relative h-[600vh]">
      <Header />
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        <div className="absolute inset-0 z-0">
          <Canvas shadows camera={{ position: [0, 0, 8], fov: 40 }}>
            <ambientLight intensity={0.5} />
            <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
            <Environment preset="city" />
            <Suitcase3D progress={smoothProgress} />
            <ContactShadows
              position={[0, -3.5, 0]}
              opacity={0.4}
              scale={10}
              blur={2}
              far={4}
            />
          </Canvas>
        </div>

        <StageOverlay
          progress={smoothProgress}
          range={STAGES.hero}
          interactive
          align="right"
          testId="section-hero"
        >
          <h1 className="text-[2.6rem] leading-[1.05] font-black tracking-tighter sm:text-7xl lg:text-8xl">
            {t("hero.title1")} <br className="hidden sm:block" />
            <span className="from-brand-ink to-brand bg-gradient-to-r bg-clip-text text-transparent">
              {t("hero.title2")}
            </span>
          </h1>
          <p className="mt-4 text-base text-neutral-700 sm:mt-6 sm:text-lg dark:text-neutral-300 md:ml-auto md:max-w-xl">
            {t("hero.sub")}
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:mt-10 sm:flex-row md:justify-end">
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
              <Link
                href="/orders/new"
                data-testid="hero-cta-pedido"
                className="bg-brand hover:bg-brand-strong block rounded-full px-6 py-3 text-center font-medium text-brand-foreground"
              >
                {t("hero.cta1")}
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
              <Link
                href="/trips/new"
                data-testid="hero-cta-viagem"
                className="glass block rounded-full px-6 py-3 text-center font-medium"
              >
                {t("hero.cta2")}
              </Link>
            </motion.div>
          </div>
          <p className="mt-8 animate-bounce text-xs text-neutral-500 sm:mt-16">
            {t("hero.scroll")}
          </p>
        </StageOverlay>

        <StageOverlay
          progress={smoothProgress}
          range={STAGES.problema}
          align="left"
          testId="section-problema"
        >
          <StageTitle>{t("problema.title")}</StageTitle>
          <div className="mt-6 grid gap-4 sm:mt-12 sm:grid-cols-2 sm:gap-6">
            <Panel>
              <h3 className="text-brand-ink font-semibold">
                {t("problema.compradores")}
              </h3>
              <p className="mt-2 text-sm text-neutral-700 dark:text-neutral-300">
                {t("problema.compradoresText")}
              </p>
            </Panel>
            <Panel>
              <h3 className="text-brand-ink font-semibold">
                {t("problema.viajantes")}
              </h3>
              <p className="mt-2 text-sm text-neutral-700 dark:text-neutral-300">
                {t("problema.viajantesText")}
              </p>
            </Panel>
          </div>
        </StageOverlay>

        <StageOverlay
          progress={smoothProgress}
          range={STAGES.como}
          align="left"
          testId="section-como"
        >
          <StageTitle>{t("como.title")}</StageTitle>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:mt-12 sm:gap-4 lg:grid-cols-4">
            <Step icon={<Package />} title={t("como.s1")} description={t("como.s1d")} />
            <Step icon={<Plane />} title={t("como.s2")} description={t("como.s2d")} />
            <Step icon={<Search />} title={t("como.s3")} description={t("como.s3d")} />
            <Step icon={<Handshake />} title={t("como.s4")} description={t("como.s4d")} />
          </div>
        </StageOverlay>

        <StageOverlay
          progress={smoothProgress}
          range={STAGES.comunicacao}
          align="center"
          testId="section-comunicacao"
        >
          <div className="flex w-full flex-col items-center gap-6 text-left lg:flex-row lg:gap-12">
            <div className="flex-1">
              <StageTitle>
                {t("com.title1")}
                <br />
                {t("com.title2")}
              </StageTitle>
              <p className="mt-4 text-base leading-relaxed text-neutral-600 sm:mt-6 sm:text-xl dark:text-neutral-400">
                {t("com.text")}
              </p>
            </div>
            <div className="flex flex-1 justify-center lg:justify-start lg:pl-16">
              <SmartPhoneMockup />
            </div>
          </div>
        </StageOverlay>

        <StageOverlay
          progress={smoothProgress}
          range={STAGES.personas}
          align="left"
          testId="section-personas"
        >
          <StageTitle>{t("personas.title")}</StageTitle>
          <div className="mt-6 grid gap-4 sm:mt-12 sm:grid-cols-2 sm:gap-6">
            <Panel>
              <MapPin className="text-brand-ink h-6 w-6" />
              <h3 className="mt-3 font-semibold">{t("personas.p1")}</h3>
              <p className="mt-2 text-sm text-neutral-700 dark:text-neutral-300">
                {t("personas.p1d")}
              </p>
            </Panel>
            <Panel>
              <ShieldCheck className="text-brand-ink h-6 w-6" />
              <h3 className="mt-3 font-semibold">{t("personas.p2")}</h3>
              <p className="mt-2 text-sm text-neutral-700 dark:text-neutral-300">
                {t("personas.p2d")}
              </p>
            </Panel>
          </div>
        </StageOverlay>

        <StageOverlay
          progress={smoothProgress}
          range={STAGES.cta}
          interactive
          align="right"
          testId="section-cta"
        >
          <h2 className="text-3xl font-black sm:text-5xl md:ml-auto md:max-w-xl">
            {t("cta.title")}
          </h2>
          <p className="mt-3 text-base text-neutral-700 sm:text-lg dark:text-neutral-300 md:ml-auto md:max-w-xl">
            {t("cta.sub")}
          </p>
          <motion.div
            className="mt-8 inline-block"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
          >
            <Link
              href="/signup"
              data-testid="cta-signup"
              className="bg-brand hover:bg-brand-strong block rounded-full px-6 py-3 font-medium text-brand-foreground"
            >
              {t("cta.button")}
            </Link>
          </motion.div>
        </StageOverlay>

        <motion.a
          href="https://wa.me/5548992084726"
          target="_blank"
          rel="noopener noreferrer"
          data-testid="whatsapp-fab"
          aria-label={t("wa.label")}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          className="absolute right-4 bottom-4 z-20 flex h-12 w-12 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg sm:right-6 sm:bottom-6 sm:h-14 sm:w-14"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6 sm:h-7 sm:w-7">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.198.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.297-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
            <path d="M12.004 2.003c-5.514 0-9.997 4.483-9.997 9.997 0 1.762.464 3.484 1.345 4.997L2 22l5.116-1.334a9.96 9.96 0 004.888 1.24h.004c5.514 0 9.997-4.483 9.997-9.998 0-2.669-1.04-5.178-2.928-7.066a9.935 9.935 0 00-7.073-2.929zm0 18.166h-.003a8.164 8.164 0 01-4.166-1.14l-.299-.177-3.037.792.812-2.96-.194-.305a8.173 8.173 0 01-1.256-4.38c0-4.518 3.677-8.194 8.196-8.194a8.14 8.14 0 015.797 2.398 8.14 8.14 0 012.399 5.796c-.001 4.519-3.678 8.17-8.249 8.17z" />
          </svg>
        </motion.a>
      </div>
    </div>
  );
}

/**
 * Cada estágio ocupa a tela inteira e é recortado pelo `overflow-hidden` do
 * container sticky. No mobile isso cortava o conteúdo, então a coluna interna
 * fica limitada à altura útil (descontando o header de 4rem) e rola sozinha
 * quando ainda assim não couber.
 */
function StageOverlay({
  progress,
  range,
  interactive = false,
  align = "center",
  testId,
  children,
}: {
  progress: MotionValue<number>;
  range: readonly [number, number, number, number];
  interactive?: boolean;
  align?: "left" | "center" | "right";
  testId?: string;
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

  const alignClass =
    align === "left"
      ? "items-start text-left"
      : align === "right"
        ? "items-end text-right"
        : "items-center text-center";

  return (
    <motion.div
      style={{ opacity, y, pointerEvents }}
      data-testid={testId}
      className={`absolute inset-x-0 top-16 bottom-0 flex flex-col justify-center overflow-y-auto px-5 py-4 sm:px-10 md:px-24 lg:px-32 ${alignClass}`}
    >
      <div className="w-full max-w-4xl">{children}</div>
    </motion.div>
  );
}

function StageTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="bg-gradient-to-br from-neutral-900 to-neutral-400 bg-clip-text pb-2 text-3xl font-black tracking-tight text-transparent sm:text-6xl dark:from-white dark:to-neutral-500">
      {children}
    </h2>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div className="glass rounded-2xl p-5 text-left sm:rounded-3xl sm:p-8 sm:text-lg">
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
    <div className="glass rounded-2xl p-4 text-left sm:rounded-3xl sm:p-6">
      <div className="bg-brand/10 text-brand-ink flex h-10 w-10 items-center justify-center rounded-full sm:h-12 sm:w-12 [&_svg]:h-5 [&_svg]:w-5">
        {icon}
      </div>
      <h3 className="mt-3 text-sm font-bold sm:mt-4 sm:text-base">{title}</h3>
      <p className="mt-1 text-xs text-neutral-600 sm:mt-2 sm:text-sm dark:text-neutral-400">
        {description}
      </p>
    </div>
  );
}

function SmartPhoneMockup() {
  const { t } = useLang();

  return (
    <div
      data-testid="chat-mockup"
      className="relative flex h-[340px] w-52 flex-col overflow-hidden rounded-[2rem] border-[6px] border-neutral-900 bg-white text-left shadow-2xl sm:h-[450px] sm:w-64 dark:border-neutral-800 dark:bg-black"
    >
      <div className="flex items-center gap-3 bg-[#075e54] p-3 text-white">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-xs">
          🤖
        </div>
        <div>
          <div className="text-sm leading-tight font-bold">Malotex Bot</div>
          <div className="text-[10px] leading-tight opacity-80">
            {t("chat.online")}
          </div>
        </div>
      </div>

      {/* justify-end mantém a última mensagem visível quando o mockup encolhe no mobile. */}
      <div className="flex flex-1 flex-col justify-end gap-3 overflow-hidden bg-[#e5ddd5] p-3 text-[11px] dark:bg-[#0b141a]">
        <div className="max-w-[85%] self-end rounded-lg rounded-tr-none bg-[#dcf8c6] p-2 text-black shadow-sm dark:bg-[#005c4b] dark:text-white">
          {t("chat.user")}
        </div>

        <div className="max-w-[85%] self-start rounded-lg rounded-tl-none bg-white p-2 text-black shadow-sm dark:bg-[#202c33] dark:text-white">
          <p>{t("chat.bot1")}</p>
          <p className="mt-1">{t("chat.bot2")}</p>
        </div>

        <div className="mt-2 max-w-[95%] self-center rounded-lg border border-yellow-200 bg-yellow-100 p-2.5 text-center text-[10px] text-yellow-800 shadow-sm dark:border-yellow-700/50 dark:bg-yellow-900/40 dark:text-yellow-200">
          <span className="mb-1 block font-bold">{t("chat.alert")}</span>
          {t("chat.alertText")}
        </div>
      </div>

      <div className="flex items-center gap-2 bg-[#f0f0f0] p-2 dark:bg-[#202c33]">
        <div className="flex h-8 flex-1 items-center rounded-full bg-white px-3 text-xs text-neutral-400 dark:bg-[#2a3942]">
          {t("chat.input")}
        </div>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#128C7E] text-white">
          <svg className="ml-0.5 h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </div>
      </div>
    </div>
  );
}
