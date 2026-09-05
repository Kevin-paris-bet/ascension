type Props = {
  code: string;
  label: string;
  className?: string;
};

/** Drapeau SVG local fourni par flag-icons, sans requête vers un CDN. */
export function CountryFlag({ code, label, className = "" }: Props) {
  return (
    <span
      className={`country-flag fi fi-${code} ${className}`.trim()}
      role="img"
      aria-label={`Drapeau de ${label}`}
      title={label}
    />
  );
}
