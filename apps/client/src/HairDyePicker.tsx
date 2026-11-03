import { HAIR_DYES } from "../../../packages/shared/looks";

/** The row of hair dye swatches; "natural" shows the keeper's own colour. */
export function HairDyePicker({ value, natural, onPick }: { value: string; natural: string; onPick: (id: string) => void }) {
  return (
    <div className="hair-dyes" role="radiogroup" aria-label="Hair dye">
      {HAIR_DYES.map((d) => (
        <button
          key={d.id}
          role="radio"
          aria-checked={value === d.id}
          title={d.name}
          aria-label={d.name}
          className={value === d.id ? "on" : ""}
          style={{ background: d.color || natural }}
          onClick={() => value !== d.id && onPick(d.id)}
        />
      ))}
    </div>
  );
}
