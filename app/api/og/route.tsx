import { ImageResponse } from "next/og";

export const runtime = "edge";

/**
 * Fallback serveur pour les partages en lien (section 11). La carte principale
 * est rendue côté client en SVG ; celle-ci sert aux aperçus X / WhatsApp /
 * Discord, qui ne peuvent pas exécuter de JavaScript.
 *
 * Format 1200x630 (ratio des aperçus de lien), pas 9:16 : ce n'est pas la même
 * surface d'affichage que la carte partagée en image.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const name = (searchParams.get("name") ?? "SANS NOM").slice(0, 22).toUpperCase();
  const tier = (searchParams.get("tier") ?? "—").toUpperCase();
  const note = searchParams.get("note") ?? "—";
  const position = searchParams.get("position") ?? "";
  const seasons = searchParams.get("seasons") ?? "";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0b0b10",
          padding: 64,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ color: "#6a6a78", fontSize: 24, letterSpacing: 8 }}>ASCENSION</div>
          <div style={{ color: "#ffffff", fontSize: 82, fontWeight: 700, marginTop: 16 }}>{name}</div>
          <div style={{ color: "#9a9aa8", fontSize: 32, marginTop: 8 }}>
            {position}
            {seasons ? ` · ${seasons} saisons` : ""}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ color: "#7a7a88", fontSize: 22, letterSpacing: 4 }}>RANG DE LÉGENDE</div>
            <div style={{ color: "#ffffff", fontSize: 68, fontWeight: 700 }}>{tier}</div>
          </div>
          <div style={{ color: "#e63946", fontSize: 96, fontWeight: 700 }}>{note}</div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
