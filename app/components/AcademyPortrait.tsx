import type { CSSProperties } from "react";

const PORTRAIT_COUNT = 9;

export function portraitIndex(value?: string): number {
  const parsed = Number.parseInt(value?.replace("portrait_", "") ?? "0", 10);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(PORTRAIT_COUNT - 1, parsed)) : 0;
}

export function AcademyPortrait({ index, className = "", label = "Portrait du joueur" }: {
  index: number;
  className?: string;
  label?: string;
}) {
  const safeIndex = Math.max(0, Math.min(PORTRAIT_COUNT - 1, index));
  const column = safeIndex % 3;
  const row = Math.floor(safeIndex / 3);
  return <span
    role="img"
    aria-label={label}
    className={`academy-portrait ${className}`.trim()}
    style={{ "--portrait-x": `${column * 50}%`, "--portrait-y": `${row * 50}%` } as CSSProperties}
  />;
}

export function PortraitPicker({ selected, onSelect }: { selected: number; onSelect: (index: number) => void }) {
  return <div className="portrait-picker" aria-label="Choisir le visage du joueur">
    {Array.from({ length: PORTRAIT_COUNT }, (_, index) => <button
      type="button"
      key={index}
      className={index === selected ? "selected" : ""}
      aria-label={`Visage ${index + 1}`}
      aria-pressed={index === selected}
      onClick={() => onSelect(index)}
    ><AcademyPortrait index={index} label="" /></button>)}
  </div>;
}
