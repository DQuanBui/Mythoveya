import { elementGuide } from "../../../packages/shared/elements";

/** Teaches the rules behind the matchup hints: who beats whom, and by how much. */
export function ElementGuide() {
  const { rows, strong, resisted } = elementGuide();
  return (
    <details className="element-guide">
      <summary>How elements work</summary>
      <p>
        A strong hit deals ×{strong} damage and a resisted one ×{resisted}. Only the attacker's element and the target's
        count.
      </p>
      <table>
        <thead>
          <tr>
            <th scope="col">Attacker</th>
            <th scope="col">Strong against</th>
            <th scope="col">Resisted by</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name}>
              <th scope="row">{r.name}</th>
              <td>{r.strong.join(", ") || "—"}</td>
              <td>{r.resisted.join(", ") || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}
