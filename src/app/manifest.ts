import type { MetadataRoute } from "next";

/**
 * `display: standalone` faz o Malotex abrir sem a barra do navegador quando o
 * usuário adiciona à tela de início — sem isso a barra de abas de baixo briga
 * com a barra de endereço do Safari.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Malotex",
    short_name: "Malotex",
    description:
      "Sua encomenda vai com quem já está indo. Conectamos quem precisa de um produto de outra cidade com viajantes que têm espaço na mala.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    lang: "pt-BR",
    background_color: "#f9f7ef",
    theme_color: "#f9f7ef",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
