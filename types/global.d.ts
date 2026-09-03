/**
 * Next.js ne fournit aucune déclaration pour les imports CSS à effet de bord
 * (`import "./globals.css"`). Sans ça, le typecheck du build échoue selon
 * l'environnement — d'où des builds qui passent en local et cassent sur Vercel.
 */
declare module "*.css";
declare module "*.scss";
