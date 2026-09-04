"use client";

import { useEffect, useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { parseCareerResult, type CareerResult } from "@/lib/careerResult";
import type { Database } from "@/types/database";
import { PlayerAvatar } from "@/app/components/PlayerAvatar";

type SortMode = "recent" | "note" | "matches";
const dateFormatter = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" });

export function CareerLibrary({ supabase, userId, onPlay }: {
  supabase: SupabaseClient<Database>;
  userId: string;
  onPlay: () => void;
}) {
  const [results, setResults] = useState<CareerResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [position, setPosition] = useState("all");
  const [sort, setSort] = useState<SortMode>("recent");
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    let active = true;
    void supabase
      .from("career_results")
      .select("id, user_id, seed, player_name, final_note, summary, completed_at")
      .eq("user_id", userId)
      .order("completed_at", { ascending: false })
      .limit(100)
      .then(({ data, error: queryError }) => {
        if (!active) return;
        if (queryError) {
          setError("Impossible de charger tes carrières pour le moment.");
        } else {
          setResults((data ?? []).map(parseCareerResult).filter((item): item is CareerResult => item !== null));
        }
        setLoading(false);
      });
    return () => { active = false; };
  }, [supabase, userId]);

  const positions = useMemo(
    () => [...new Set(results.map((item) => item.summary.position))].sort((a, b) => a.localeCompare(b, "fr")),
    [results]
  );

  const visible = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("fr");
    return results
      .filter((item) => !query || item.player_name.toLocaleLowerCase("fr").includes(query))
      .filter((item) => position === "all" || item.summary.position === position)
      .toSorted((a, b) => {
        if (sort === "note") return b.final_note - a.final_note;
        if (sort === "matches") return b.summary.matches - a.summary.matches;
        return Date.parse(b.completed_at) - Date.parse(a.completed_at);
      });
  }, [position, results, search, sort]);

  const compared = selected
    .map((id) => results.find((item) => item.id === id))
    .filter((item): item is CareerResult => Boolean(item));

  function toggleSelection(id: string) {
    setSelected((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      return [...current.slice(-1), id];
    });
  }

  if (loading) return <section className="library-empty"><p>Ouverture des archives du club…</p></section>;

  return (
    <section className="library-page">
      <div className="library-heading">
        <div><p className="eyebrow">Ton histoire, saison après saison</p><h1 className="display-title">Mes carrières</h1></div>
        <button className="primary-button" onClick={onPlay}>Nouvelle carrière</button>
      </div>

      {error && <p className="notice">{error}</p>}

      {!error && results.length === 0 ? (
        <div className="library-empty"><p className="eyebrow">Aucune archive</p><h2>Ta première légende reste à écrire.</h2><button className="primary-button" onClick={onPlay}>Commencer</button></div>
      ) : null}

      {results.length > 0 ? <>
        <div className="library-tools">
          <label><span>Rechercher</span><input className="text-input" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nom du joueur" /></label>
          <label><span>Poste</span><select value={position} onChange={(event) => setPosition(event.target.value)}><option value="all">Tous</option>{positions.map((item) => <option value={item} key={item}>{item}</option>)}</select></label>
          <label><span>Trier</span><select value={sort} onChange={(event) => setSort(event.target.value as SortMode)}><option value="recent">Plus récentes</option><option value="note">Meilleure note</option><option value="matches">Plus de matchs</option></select></label>
        </div>

        {compared.length === 2 && <Comparison first={compared[0]} second={compared[1]} />}

        <div className="library-summary"><span>{visible.length} carrière{visible.length > 1 ? "s" : ""}</span><span>{selected.length}/2 sélectionnée{selected.length > 1 ? "s" : ""} pour comparer</span></div>
        <div className="career-grid">
          {visible.map((result) => {
            const card = result.summary;
            const isSelected = selected.includes(result.id);
            return <article className={`career-tile${isSelected ? " selected" : ""}`} key={result.id}>
              <div className="career-tile-top"><PlayerAvatar className="career-avatar" seed={card.seed || card.name} /><span className="career-number">#{card.number}</span><span className="career-note">{card.note}</span></div>
              <p className="career-tier">{card.tier}</p><h2>{card.name}</h2><p className="career-meta">{card.position}{card.origin ? ` · ${card.origin}` : ""}</p>
              <div className="career-stats"><span><strong>{card.matches}</strong> matchs</span><span><strong>{card.goals}</strong> buts</span><span><strong>{card.assists}</strong> passes</span><span><strong>{card.caps}</strong> sélections</span></div>
              <div className="career-tile-footer"><time dateTime={result.completed_at}>{dateFormatter.format(new Date(result.completed_at))}</time><button className="compare-button" aria-pressed={isSelected} onClick={() => toggleSelection(result.id)}>{isSelected ? "Sélectionnée" : "Comparer"}</button></div>
            </article>;
          })}
        </div>
        {visible.length === 0 && <div className="library-empty"><p>Aucune carrière ne correspond à ces filtres.</p></div>}
      </> : null}
    </section>
  );
}

function Comparison({ first, second }: { first: CareerResult; second: CareerResult }) {
  const rows: Array<[string, number, number]> = [
    ["Note", first.summary.note, second.summary.note],
    ["Matchs", first.summary.matches, second.summary.matches],
    ["Buts", first.summary.goals, second.summary.goals],
    ["Passes", first.summary.assists, second.summary.assists],
    ["Sélections", first.summary.caps, second.summary.caps],
  ];
  return <section className="comparison" aria-label="Comparaison de deux carrières"><p className="eyebrow">Face-à-face</p><div className="comparison-names"><strong>{first.player_name}</strong><span>VS</span><strong>{second.player_name}</strong></div><div className="comparison-table">{rows.map(([label, a, b]) => <div className="comparison-row" key={label}><strong className={a > b ? "winner" : ""}>{a}</strong><span>{label}</span><strong className={b > a ? "winner" : ""}>{b}</strong></div>)}</div></section>;
}
