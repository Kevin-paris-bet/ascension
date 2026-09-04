export type Confederation = "Europe" | "Afrique" | "Amériques" | "Asie";

export type NationalTeam = {
  id: string;
  name: string;
  flag: string;
  confederation: Confederation;
  strength: number;
};

const NATIONAL_TEAMS: NationalTeam[] = [
  { id: "france", name: "France", flag: "🇫🇷", confederation: "Europe", strength: 94 },
  { id: "angleterre", name: "Angleterre", flag: "🏴", confederation: "Europe", strength: 92 },
  { id: "espagne", name: "Espagne", flag: "🇪🇸", confederation: "Europe", strength: 94 },
  { id: "italie", name: "Italie", flag: "🇮🇹", confederation: "Europe", strength: 90 },
  { id: "allemagne", name: "Allemagne", flag: "🇩🇪", confederation: "Europe", strength: 91 },
  { id: "portugal", name: "Portugal", flag: "🇵🇹", confederation: "Europe", strength: 90 },
  { id: "pays_bas", name: "Pays-Bas", flag: "🇳🇱", confederation: "Europe", strength: 88 },
  { id: "belgique", name: "Belgique", flag: "🇧🇪", confederation: "Europe", strength: 86 },
  { id: "croatie", name: "Croatie", flag: "🇭🇷", confederation: "Europe", strength: 86 },
  { id: "suisse", name: "Suisse", flag: "🇨🇭", confederation: "Europe", strength: 82 },
  { id: "turquie", name: "Turquie", flag: "🇹🇷", confederation: "Europe", strength: 81 },
  { id: "pologne", name: "Pologne", flag: "🇵🇱", confederation: "Europe", strength: 80 },
  { id: "norvege", name: "Norvège", flag: "🇳🇴", confederation: "Europe", strength: 79 },
  { id: "suede", name: "Suède", flag: "🇸🇪", confederation: "Europe", strength: 78 },
  { id: "bresil", name: "Brésil", flag: "🇧🇷", confederation: "Amériques", strength: 94 },
  { id: "argentine", name: "Argentine", flag: "🇦🇷", confederation: "Amériques", strength: 95 },
  { id: "uruguay", name: "Uruguay", flag: "🇺🇾", confederation: "Amériques", strength: 87 },
  { id: "colombie", name: "Colombie", flag: "🇨🇴", confederation: "Amériques", strength: 83 },
  { id: "mexique", name: "Mexique", flag: "🇲🇽", confederation: "Amériques", strength: 82 },
  { id: "etats_unis", name: "États-Unis", flag: "🇺🇸", confederation: "Amériques", strength: 81 },
  { id: "canada", name: "Canada", flag: "🇨🇦", confederation: "Amériques", strength: 76 },
  { id: "maroc", name: "Maroc", flag: "🇲🇦", confederation: "Afrique", strength: 86 },
  { id: "senegal", name: "Sénégal", flag: "🇸🇳", confederation: "Afrique", strength: 85 },
  { id: "cote_ivoire", name: "Côte d’Ivoire", flag: "🇨🇮", confederation: "Afrique", strength: 83 },
  { id: "cameroun", name: "Cameroun", flag: "🇨🇲", confederation: "Afrique", strength: 82 },
  { id: "algerie", name: "Algérie", flag: "🇩🇿", confederation: "Afrique", strength: 82 },
  { id: "tunisie", name: "Tunisie", flag: "🇹🇳", confederation: "Afrique", strength: 78 },
  { id: "egypte", name: "Égypte", flag: "🇪🇬", confederation: "Afrique", strength: 81 },
  { id: "mali", name: "Mali", flag: "🇲🇱", confederation: "Afrique", strength: 78 },
  { id: "rdc", name: "RD Congo", flag: "🇨🇩", confederation: "Afrique", strength: 77 },
  { id: "japon", name: "Japon", flag: "🇯🇵", confederation: "Asie", strength: 84 },
  { id: "coree_sud", name: "Corée du Sud", flag: "🇰🇷", confederation: "Asie", strength: 83 },
  { id: "arabie_saoudite", name: "Arabie saoudite", flag: "🇸🇦", confederation: "Asie", strength: 77 },
  { id: "australie", name: "Australie", flag: "🇦🇺", confederation: "Asie", strength: 79 },
];

const nationalTeamById = new Map(NATIONAL_TEAMS.map((team) => [team.id, team]));

export function getNationalTeams(): NationalTeam[] {
  return NATIONAL_TEAMS;
}

export function getNationalTeam(id: string): NationalTeam {
  const team = nationalTeamById.get(id);
  if (!team) throw new Error(`Sélection inconnue: ${id}`);
  return team;
}

export function nationalTeamIdFromSelection(optionId: string | undefined): string {
  const id = optionId?.replace(/^opt_nat_/, "") ?? "france";
  return nationalTeamById.has(id) ? id : "france";
}
