import type { Profile } from "../../../packages/shared/types";
import { ITEMS, townOf, utcDay } from "../../../packages/shared/town";
import { BUFFS, SHOPS, shopStock, type ShopId } from "../../../packages/shared/shops";
import { Avatar } from "./Scene";
import { Canvas } from "@react-three/fiber";
import { ModelLighting } from "./ModelLighting";

const SHOWN: Record<ShopId, string[]> = {
  smith: ["dust", "crystal"],
  apothecary: ["elixir", "tome", "crystal", "skyfin"],
};
/** A shop counter: today's stock, prices, limits and the keeper's greeting. */
export function ShopPanel({
  shop,
  profile,
  run,
}: {
  shop: ShopId;
  profile: Profile;
  run: (kind: string, value?: any) => Promise<any>;
}) {
  const info = SHOPS[shop],
    t = townOf(profile),
    today = utcDay(),
    bought = t.shopDay === today ? t.shopBought || {} : {},
    stock = shopStock(shop);
  return (
    <div className="shop">
      <div className="shop-head">
        <div className="shop-keeper" aria-hidden="true">
          <Canvas camera={{ position: [0.35, 0.3, 2.5], fov: 30 }} dpr={[1, 1.5]}>
            <ModelLighting intensity={0.8} />
            <ambientLight intensity={1.4} />
            <directionalLight position={[2, 3, 3]} intensity={2.4} />
            {/* Lowered so the default camera frames head and shoulders. */}
            <group position={[0, -1.25, 0]}>
              <Avatar index={shop === "smith" ? 4 : 5} />
            </group>
          </Canvas>
        </div>
        <div>
          <p className="eyebrow">{info.name.toUpperCase()} · HAVENREACH</p>
          <h2>{info.keeper}</h2>
          <p className="muted">“{info.greeting}”</p>
          <div className="supply-bag">
            <span>◉ Gold <b>{profile.gold.toLocaleString()}</b></span>
            {SHOWN[shop].map((id) => (
              <span key={id} title={ITEMS[id as keyof typeof ITEMS]?.description}>
                {ITEMS[id as keyof typeof ITEMS].icon} {ITEMS[id as keyof typeof ITEMS].name}{" "}
                <b>{t.inventory[id] || 0}</b>
              </span>
            ))}
            {shop === "apothecary" &&
              (["vigor", "swift"] as const).map((b) => (
                <span key={b} title={BUFFS[b].text}>
                  {b === "vigor" ? "♥" : "➶"} {BUFFS[b].name} ready <b>{t.buffs?.[b] || 0}</b>
                </span>
              ))}
          </div>
        </div>
      </div>
      <div className="market-stock shop-stock">
        {stock.map((o) => {
          const left = o.limit - (bought[`${shop}:${o.id}`] || 0),
            missing = Object.entries(o.needs || {}).find(([id, n]) => (t.inventory[id] || 0) < n);
          return (
            <article key={o.id}>
              <span className="item-symbol">{o.icon}</span>
              <h3>{o.name}</h3>
              <p>{o.description}</p>
              <small>
                {left} left today · {o.gold} Gold
                {o.needs
                  ? ` · ${Object.entries(o.needs)
                      .map(([id, n]) => `${n} ${ITEMS[id as keyof typeof ITEMS].name}`)
                      .join(", ")}`
                  : ""}
              </small>
              <button
                disabled={left <= 0 || profile.gold < o.gold || !!missing}
                onClick={() => run("town-shop", { quest: shop, item: o.id })}
              >
                {left <= 0
                  ? "Sold out today"
                  : missing
                    ? `Needs ${missing[1]} ${ITEMS[missing[0] as keyof typeof ITEMS].name}`
                    : profile.gold < o.gold
                      ? "Not enough Gold"
                      : `Buy · ${o.gold} Gold`}
              </button>
            </article>
          );
        })}
      </div>
      <p className="muted small-print">
        {shop === "smith"
          ? "New pieces arrive every day at 00:00 UTC; an Epic piece appears every third day. Equip them from a companion's journal page."
          : "Tonics apply to your whole team in the next wild encounter, guardian, story stage, dungeon or tower battle, then fade."}
      </p>
    </div>
  );
}
