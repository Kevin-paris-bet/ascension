const FLAG_CODE_BY_COUNTRY: Record<string, string> = {
  France: "fr",
  Angleterre: "gb-eng",
  Espagne: "es",
  Italie: "it",
  Allemagne: "de",
  Portugal: "pt",
  "Pays-Bas": "nl",
  Belgique: "be",
  "Écosse": "gb-sct",
  Turquie: "tr",
  Autriche: "at",
  Suisse: "ch",
  "Grèce": "gr",
  Danemark: "dk",
  "Norvège": "no",
  "Suède": "se",
  Pologne: "pl",
  "Tchéquie": "cz",
  "Arabie saoudite": "sa",
  "Brésil": "br",
  Argentine: "ar",
};

export function getCountryFlagCode(country: string): string {
  const code = FLAG_CODE_BY_COUNTRY[country];
  if (!code) throw new Error(`Drapeau inconnu pour le pays : ${country}`);
  return code;
}
