import { useRef } from "react";
import { HAIR_DYES } from "../../../packages/shared/looks";

/** The row of hair dye swatches; "natural" shows the keeper's own colour.
 * Tab reaches the chosen swatch; arrow keys, Home and End move between
 * swatches, and Enter or Space picks one (each pick may save, so moving
 * alone does not). */
export function HairDyePicker({ value, natural, onPick }: { value: string; natural: string; onPick: (id: string) => void }) {
  const row = useRef<HTMLDivElement>(null),
    // Keep one swatch reachable by Tab even if the save holds an unknown dye.
    focusable = HAIR_DYES.some((d) => d.id === value) ? value : "natural";
  const move = (e: React.KeyboardEvent, i: number) => {
    const n = HAIR_DYES.length,
      next = { ArrowRight: i + 1, ArrowDown: i + 1, ArrowLeft: i - 1, ArrowUp: i - 1, Home: 0, End: n - 1 }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    (row.current?.children[(next + n) % n] as HTMLElement | undefined)?.focus();
  };
  return (
    <div className="hair-dyes" role="radiogroup" aria-label="Hair dye" ref={row}>
      {HAIR_DYES.map((d, i) => (
        <button
          key={d.id}
          role="radio"
          aria-checked={value === d.id}
          tabIndex={focusable === d.id ? 0 : -1}
          title={d.name}
          aria-label={d.name}
          className={value === d.id ? "on" : ""}
          style={{ background: d.color || natural }}
          onKeyDown={(e) => move(e, i)}
          onClick={() => value !== d.id && onPick(d.id)}
        />
      ))}
    </div>
  );
}
