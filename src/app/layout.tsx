import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Script from "next/script";
import BottomNav from "@/components/BottomNav";
import HelpFab from "@/components/HelpFab";
import { THEME_INIT_SCRIPT } from "@/lib/theme";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LevAí — sua encomenda vai com quem já está indo",
  description:
    "Conectamos quem precisa de um produto de outra cidade com viajantes que têm espaço sobrando na mala.",
  applicationName: "LevAí",
};

/* App mobile-first: sem zoom acidental e respeitando o recorte da tela. */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f9f7ef" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0a06" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="bg-surface flex min-h-full flex-col">
        <Script
          id="levai-theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}
        />
        <main className="flex-1">{children}</main>
        <HelpFab />
        <BottomNav />
      </body>
    </html>
  );
}
