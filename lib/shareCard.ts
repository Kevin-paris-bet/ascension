"use client";

declare global {
  interface Window {
    AscensionNativeShare?: (blob: Blob, filename: string, text: string) => Promise<"share" | "cancelled">;
  }
}

import { CARD_WIDTH, CARD_HEIGHT } from "@/app/components/LegacyCard";

/**
 * Sérialise le SVG de la carte et le rastérise en PNG côté client (section 11).
 * Aucune dépendance externe : on passe par un blob SVG, une Image, puis un
 * canvas. Les polices utilisées sont volontairement des polices système, sinon
 * elles ne seraient pas embarquées dans le SVG sérialisé et le rendu casserait.
 */
export async function cardToPngBlob(svgElement: SVGSVGElement, scale = 1): Promise<Blob> {
  const clone = svgElement.cloneNode(true) as SVGSVGElement;
  // Le composant est dimensionné en CSS (width:100%) pour s'adapter à la page.
  // Hors du document, ce pourcentage n'a aucun conteneur contre lequel se
  // résoudre et le rendu sort vide : on retire le style et on impose les
  // dimensions réelles de la carte.
  clone.removeAttribute("style");
  clone.setAttribute("width", String(CARD_WIDTH));
  clone.setAttribute("height", String(CARD_HEIGHT));

  const source = new XMLSerializer().serializeToString(clone);
  const svgBlob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Impossible de rastériser la carte"));
      img.src = url;
    });

    const canvas = document.createElement("canvas");
    canvas.width = CARD_WIDTH * scale;
    canvas.height = CARD_HEIGHT * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas indisponible");
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Export PNG échoué"))), "image/png");
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Let Android's download manager consume the URL before releasing it.
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

/**
 * Partage natif quand il est disponible (mobile), téléchargement sinon.
 * Renvoie le canal réellement utilisé pour permettre de mesurer le taux de
 * partage — la métrique de survie du projet (≥ 5 %, section 11).
 */
export async function shareCard(svgElement: SVGSVGElement, playerName: string, note: number): Promise<"share" | "download" | "cancelled"> {
  const blob = await cardToPngBlob(svgElement);
  return shareCardBlob(blob, playerName, note);
}

export async function shareCardBlob(blob: Blob, playerName: string, note: number): Promise<"share" | "download" | "cancelled"> {
  const filename = `ascension-${playerName.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "carriere"}.png`;
  if (window.AscensionNativeShare) {
    return window.AscensionNativeShare(blob, filename, `J’ai obtenu ${note}/100 sur Ascension. Tu peux faire mieux ?`);
  }
  const file = new File([blob], filename, { type: "image/png" });

  const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
  if (typeof nav.share === "function" && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: "Ma carrière Ascension", text: `J’ai obtenu ${note}/100 sur Ascension. Tu peux faire mieux ?` });
      return "share";
    } catch (err) {
      // L'utilisateur a annulé la feuille de partage : on ne retombe pas sur
      // un téléchargement qu'il n'a pas demandé.
      if (err instanceof DOMException && err.name === "AbortError") return "cancelled";
    }
  }

  downloadBlob(blob, filename);
  return "download";
}
