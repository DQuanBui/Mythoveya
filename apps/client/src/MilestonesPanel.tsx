import type { Profile } from "../../../packages/shared/types";
import { keeperTitle, milestoneProgress } from "../../../packages/shared/milestones";

/** Lifetime milestones and the titles they grant. */
export function MilestonesPanel({ profile }: { profile: Profile }) {
  const list = milestoneProgress(profile),
    title = keeperTitle(profile),
    done = list.filter((m) => m.done).length;
  return (
    <div className="milestones">
      <p className="eyebrow">KEEPER RECORD · {done} OF {list.length} TITLES</p>
      <h2>{title ? `${profile.name}, ${title}` : `${profile.name}'s milestones`}</h2>
      <p className="muted">Titles come from everything you've already done. Your most prestigious title is shown on your keeper badge.</p>
      <ul className="milestone-list">
        {list.map((m) => (
          <li key={m.id} className={m.done ? "done" : ""}>
            <span aria-hidden="true">{m.done ? "★" : "☆"}</span>
            <div>
              <strong>{m.title}</strong>
              <small>{m.text}</small>
              <i role="progressbar" aria-label={`${m.title} progress`} aria-valuemin={0} aria-valuemax={m.goal} aria-valuenow={m.value}>
                <b style={{ width: `${(m.value / m.goal) * 100}%` }} />
              </i>
            </div>
            <em>
              {m.value}/{m.goal}
            </em>
          </li>
        ))}
      </ul>
    </div>
  );
}
