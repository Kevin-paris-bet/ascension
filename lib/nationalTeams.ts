export type Confederation = "Europe" | "Afrique" | "Amériques" | "Asie";

export type NationalTeam = {
  id: string;
  name: string;
  flag: string;
  flagCode: string;
  confederation: Confederation;
  strength: number;
};

const NATIONAL_TEAMS: NationalTeam[] = [
  { id: "france", name: "France", flag: "🇫🇷", flagCode: "fr", confederation: "Europe", strength: 94 },
  { id: "angleterre", name: "Angleterre", flag: "🏴", flagCode: "gb-eng", confederation: "Europe", strength: 92 },
  { id: "espagne", name: "Espagne", flag: "🇪🇸", flagCode: "es", confederation: "Europe", strength: 94 },
  { id: "italie", name: "Italie", flag: "🇮🇹", flagCode: "it", confederation: "Europe", strength: 90 },
  { id: "allemagne", name: "Allemagne", flag: "🇩🇪", flagCode: "de", confederation: "Europe", strength: 91 },
  { id: "portugal", name: "Portugal", flag: "🇵🇹", flagCode: "pt", confederation: "Europe", strength: 90 },
  { id: "pays_bas", name: "Pays-Bas", flag: "🇳🇱", flagCode: "nl", confederation: "Europe", strength: 88 },
  { id: "belgique", name: "Belgique", flag: "🇧🇪", flagCode: "be", confederation: "Europe", strength: 86 },
  { id: "croatie", name: "Croatie", flag: "🇭🇷", flagCode: "hr", confederation: "Europe", strength: 86 },
  { id: "suisse", name: "Suisse", flag: "🇨🇭", flagCode: "ch", confederation: "Europe", strength: 82 },
  { id: "turquie", name: "Turquie", flag: "🇹🇷", flagCode: "tr", confederation: "Europe", strength: 81 },
  { id: "pologne", name: "Pologne", flag: "🇵🇱", flagCode: "pl", confederation: "Europe", strength: 80 },
  { id: "norvege", name: "Norvège", flag: "🇳🇴", flagCode: "no", confederation: "Europe", strength: 79 },
  { id: "suede", name: "Suède", flag: "🇸🇪", flagCode: "se", confederation: "Europe", strength: 78 },
  { id: "bresil", name: "Brésil", flag: "🇧🇷", flagCode: "br", confederation: "Amériques", strength: 94 },
  { id: "argentine", name: "Argentine", flag: "🇦🇷", flagCode: "ar", confederation: "Amériques", strength: 95 },
  { id: "uruguay", name: "Uruguay", flag: "🇺🇾", flagCode: "uy", confederation: "Amériques", strength: 87 },
  { id: "colombie", name: "Colombie", flag: "🇨🇴", flagCode: "co", confederation: "Amériques", strength: 83 },
  { id: "mexique", name: "Mexique", flag: "🇲🇽", flagCode: "mx", confederation: "Amériques", strength: 82 },
  { id: "etats_unis", name: "États-Unis", flag: "🇺🇸", flagCode: "us", confederation: "Amériques", strength: 81 },
  { id: "canada", name: "Canada", flag: "🇨🇦", flagCode: "ca", confederation: "Amériques", strength: 76 },
  { id: "maroc", name: "Maroc", flag: "🇲🇦", flagCode: "ma", confederation: "Afrique", strength: 86 },
  { id: "senegal", name: "Sénégal", flag: "🇸🇳", flagCode: "sn", confederation: "Afrique", strength: 85 },
  { id: "cote_ivoire", name: "Côte d’Ivoire", flag: "🇨🇮", flagCode: "ci", confederation: "Afrique", strength: 83 },
  { id: "cameroun", name: "Cameroun", flag: "🇨🇲", flagCode: "cm", confederation: "Afrique", strength: 82 },
  { id: "algerie", name: "Algérie", flag: "🇩🇿", flagCode: "dz", confederation: "Afrique", strength: 82 },
  { id: "tunisie", name: "Tunisie", flag: "🇹🇳", flagCode: "tn", confederation: "Afrique", strength: 78 },
  { id: "egypte", name: "Égypte", flag: "🇪🇬", flagCode: "eg", confederation: "Afrique", strength: 81 },
  { id: "mali", name: "Mali", flag: "🇲🇱", flagCode: "ml", confederation: "Afrique", strength: 78 },
  { id: "rdc", name: "RD Congo", flag: "🇨🇩", flagCode: "cd", confederation: "Afrique", strength: 77 },
  { id: "japon", name: "Japon", flag: "🇯🇵", flagCode: "jp", confederation: "Asie", strength: 84 },
  { id: "coree_sud", name: "Corée du Sud", flag: "🇰🇷", flagCode: "kr", confederation: "Asie", strength: 83 },
  { id: "arabie_saoudite", name: "Arabie saoudite", flag: "🇸🇦", flagCode: "sa", confederation: "Asie", strength: 77 },
  { id: "australie", name: "Australie", flag: "🇦🇺", flagCode: "au", confederation: "Asie", strength: 79 },
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
