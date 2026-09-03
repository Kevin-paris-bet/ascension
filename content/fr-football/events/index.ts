import { EventSchema, type Event } from "../../../engine/schema";
import a1_amitie from "./a1_amitie.json";
import a1_argent_famille from "./a1_argent_famille.json";
import a1_corps from "./a1_corps.json";
import a1_echec from "./a1_echec.json";
import a1_ecole from "./a1_ecole.json";
import a1_mentor from "./a1_mentor.json";
import a1_poste from "./a1_poste.json";
import a1_recruteur from "./a1_recruteur.json";
import a1_reputation from "./a1_reputation.json";
import a1_rival from "./a1_rival.json";
import a1_sacrifice from "./a1_sacrifice.json";
import a1_selection_jeunes from "./a1_selection_jeunes.json";
import a1_tentation from "./a1_tentation.json";
import a2_agent from "./a2_agent.json";
import a2_blessure_jeune from "./a2_blessure_jeune.json";
import a2_concurrence from "./a2_concurrence.json";
import a2_contrat from "./a2_contrat.json";
import a2_famille_doute from "./a2_famille_doute.json";
import a2_journaliste from "./a2_journaliste.json";
import a2_premier_salaire from "./a2_premier_salaire.json";
import a2_premiere_titularisation from "./a2_premiere_titularisation.json";
import a2_pret from "./a2_pret.json";
import a2_signature from "./a2_signature.json";
import a2_stage from "./a2_stage.json";
import a2_vestiaire from "./a2_vestiaire.json";
import a3_blessure_grave from "./a3_blessure_grave.json";
import a3_capitanat from "./a3_capitanat.json";
import a3_carrefour_saison6 from "./a3_carrefour_saison6.json";
import a3_clause from "./a3_clause.json";
import a3_coach_conflit from "./a3_coach_conflit.json";
import a3_corps_facture from "./a3_corps_facture.json";
import a3_corps_leger from "./a3_corps_leger.json";
import a3_declin from "./a3_declin.json";
import a3_derniere_saison from "./a3_derniere_saison.json";
import a3_dette from "./a3_dette.json";
import a3_ennemi from "./a3_ennemi.json";
import a3_exil_dore from "./a3_exil_dore.json";
import a3_finale from "./a3_finale.json";
import a3_investissement from "./a3_investissement.json";
import a3_jeune_pousse from "./a3_jeune_pousse.json";
import a3_media_pression from "./a3_media_pression.json";
import a3_mentor_fin from "./a3_mentor_fin.json";
import a3_promesse from "./a3_promesse.json";
import a3_protege from "./a3_protege.json";
import a3_reconversion from "./a3_reconversion.json";
import a3_retour_quartier from "./a3_retour_quartier.json";
import a3_rival_retour from "./a3_rival_retour.json";
import a3_selection_a from "./a3_selection_a.json";
import a3_tentation_paris from "./a3_tentation_paris.json";
import a3_titre_manque from "./a3_titre_manque.json";
import a3_transfert_reve from "./a3_transfert_reve.json";
import a3_vie_privee from "./a3_vie_privee.json";

const raw = [
  a1_amitie,
  a1_argent_famille,
  a1_corps,
  a1_echec,
  a1_ecole,
  a1_mentor,
  a1_poste,
  a1_recruteur,
  a1_reputation,
  a1_rival,
  a1_sacrifice,
  a1_selection_jeunes,
  a1_tentation,
  a2_agent,
  a2_blessure_jeune,
  a2_concurrence,
  a2_contrat,
  a2_famille_doute,
  a2_journaliste,
  a2_premier_salaire,
  a2_premiere_titularisation,
  a2_pret,
  a2_signature,
  a2_stage,
  a2_vestiaire,
  a3_blessure_grave,
  a3_capitanat,
  a3_carrefour_saison6,
  a3_clause,
  a3_coach_conflit,
  a3_corps_facture,
  a3_corps_leger,
  a3_declin,
  a3_derniere_saison,
  a3_dette,
  a3_ennemi,
  a3_exil_dore,
  a3_finale,
  a3_investissement,
  a3_jeune_pousse,
  a3_media_pression,
  a3_mentor_fin,
  a3_promesse,
  a3_protege,
  a3_reconversion,
  a3_retour_quartier,
  a3_rival_retour,
  a3_selection_a,
  a3_tentation_paris,
  a3_titre_manque,
  a3_transfert_reve,
  a3_vie_privee,
];

/** Revalidés au chargement : un JSON corrompu casse au build, jamais en jeu. */
export const events: Event[] = raw.map((e) => EventSchema.parse(e));
