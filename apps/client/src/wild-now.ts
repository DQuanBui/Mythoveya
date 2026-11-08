import { useEffect, useState } from "react";
import { NEWCOMER_WINS, specialsNow, wildTimes } from "../../../packages/shared/wild";
/** Who is out in the wild only now in a region, rechecked every few seconds;
 * nobody until the keeper has the wins to meet them. */
export function useWildNow(region: string, wins: number) {
  const read = () => (wins < NEWCOMER_WINS ? "" : specialsNow(region, wildTimes(region)).join(","));
  const [out, setOut] = useState(read);
  useEffect(() => {
    setOut(read());
    const t = setInterval(() => setOut(read()), 5000);
    return () => clearInterval(t);
  }, [region, wins >= NEWCOMER_WINS]);
  return out ? out.split(",") : [];
}
