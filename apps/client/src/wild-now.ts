import { useEffect, useState } from "react";
import { specialsNow, wildTimes } from "../../../packages/shared/wild";
/** Who is out in the wild only now in a region, rechecked every few seconds. */
export function useWildNow(region: string) {
  const read = () => specialsNow(region, wildTimes(region)).join(",");
  const [out, setOut] = useState(read);
  useEffect(() => {
    setOut(read());
    const t = setInterval(() => setOut(read()), 5000);
    return () => clearInterval(t);
  }, [region]);
  return out ? out.split(",") : [];
}
