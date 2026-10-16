import { Kit, SHAPES } from "./village-kit";
import {
  ROOM_FURNITURE,
  type Lodge,
  type LodgeRecord,
} from "../../../packages/shared/lodges";
/** One owned geometry per room state; its mounting component disposes it. */
export function buildLodge(s: Lodge, r: LodgeRecord) {
  const k = new Kit(),
    wood = s.region === "hollow" ? "#968b91" : "#ae855f";
  for (let x = -6.8; x < 7; x += 0.7)
    k.box(x % 1.4 < 0.7 ? wood : "#b69778", [x, -0.1, 0], [0.68, 0.2, 15.4]);
  k.box(s.wall, [0, 1.7, -7.7], [14.4, 3.4, 0.25]);
  k.box(s.wall, [-7.1, 1.7, 0], [0.25, 3.4, 15.4]);
  // Low foreground walls keep the keeper and small companions visible.
  k.box(wood, [7.1, 0.2, 0], [0.25, 0.4, 15.4]);
  for (const side of [-1, 1])
    k.box(wood, [side * 4.2, 0.2, 7.7], [5.7, 0.4, 0.25]);
  for (const x of [-7, 0, 7]) {
    k.box("#6a5449", [x, 1.7, -7.5], [0.18, 3.4, 0.18]);
  }
  k.box("#6a5449", [0, 3.3, -7.5], [14.2, 0.18, 0.18]);
  k.box(s.color, [0, 0.015, 3.4], [4.6, 0.025, 4.8]);
  for (const x of [-2.05, 2.05])
    k.box("#e9d8b2", [x, 0.033, 3.4], [0.06, 0.015, 4.4]);
  for (const z of [1.25, 5.55])
    k.box("#e9d8b2", [0, 0.033, z], [4.1, 0.015, 0.06]);
  // Window alcove, with a different regional view.
  k.box("#65524a", [2.6, 2, -7.52], [3.7, 2.2, 0.2]);
  k.box(
    s.region === "hollow"
      ? "#bddce3"
      : s.region === "canyon"
        ? "#dbb19a"
        : "#a7c8c9",
    [2.6, 2, -7.37],
    [3.4, 1.9, 0.08],
  );
  for (let i = 0; i < 3; i++)
    k.add(
      SHAPES.CONE4,
      s.region === "canyon"
        ? "#aa775f"
        : s.region === "hollow"
          ? "#edf0ef"
          : "#73938c",
      [1.5 + i, 1.6, -7.27],
      [0.7, 0.9 + i * 0.15, 0.04],
    );
  k.box("#dac4a0", [2.6, 2, -7.18], [0.09, 1.9, 0.08]);
  k.box("#dac4a0", [2.6, 2, -7.18], [3.4, 0.09, 0.08]);
  for (const x of [0.6, 4.6]) k.box(s.color, [x, 2, -7.13], [0.45, 2.3, 0.18]);
  for (const f of ROOM_FURNITURE) {
    if (f.id === "table") {
      k.box("#865d43", [f.x, 1.05, f.z], [f.w, 0.18, f.d]);
      for (const x of [-1.2, 1.2])
        for (const z of [-0.7, 0.7])
          k.box("#6c5140", [x, 0.5, f.z + z], [0.15, 1, 0.15]);
      for (let i = 0; i < 4; i++) {
        const x = i % 2 ? 0.9 : -0.9,
          z = f.z + (i < 2 ? -0.55 : 0.55);
        k.add(SHAPES.CYL, "#eee0c5", [x, 1.17, z], [0.28, 0.035, 0.28]);
        if (r.meal)
          k.add(
            SHAPES.BALL,
            s.region === "meadow" ? "#91b277" : "#bd7853",
            [x, 1.22, z],
            [0.2, 0.055, 0.2],
          );
      }
    } else if (f.id === "counter") {
      k.box("#7d6250", [f.x, 0.6, f.z], [f.w, 1.2, f.d]);
      k.box("#d3c6ad", [f.x, 1.24, f.z], [f.w + 0.08, 0.12, f.d + 0.08]);
      k.add(
        SHAPES.BALL,
        s.region === "canyon" ? "#bc805a" : "#718b8b",
        [f.x, 1.55, f.z - 0.7],
        [0.43, 0.35, 0.43],
      );
      k.add(SHAPES.CYL, "#c5b28a", [f.x, 1.9, f.z - 0.7], [0.2, 0.05, 0.2]);
      for (let i = 0; i < 3; i++)
        k.add(
          SHAPES.CYL6,
          [s.color, "#c39678", "#a3adb2"][i],
          [f.x, 1.48, f.z + 0.2 + i * 0.45],
          [0.16, 0.32, 0.16],
        );
    } else if (f.id === "shelf") {
      k.box("#6d5648", [f.x, 0.9, f.z], [f.w, 1.8, f.d]);
      for (let row = 0; row < 2; row++)
        for (let i = 0; i < 6; i++)
          k.box(
            i % 2 ? s.color : "#d0af83",
            [f.x - 0.76, 0.55 + row * 0.75, f.z - 0.8 + i * 0.3],
            [0.06, 0.5, 0.22],
          );
      k.box("#e9d7b5", [f.x, 1.86, f.z], [0.7, 0.08, 0.9], [0, 0.2, 0]);
    } else if (f.id === "bench") {
      k.box("#795947", [f.x, 0.4, f.z], [f.w, 0.65, f.d]);
      k.box(s.color, [f.x, 0.78, f.z], [f.w, 0.18, f.d]);
      for (const z of [-0.8, 0.8])
        k.box("#e1cfb6", [f.x, 0.95, f.z + z], [0.9, 0.25, 0.65], [0, 0, 0.1]);
    } else {
      k.box("#77787b", [f.x, 0.65, f.z], [f.w, 1.3, f.d]);
      k.box("#3c3541", [f.x, 0.55, f.z + 0.52], [1.7, 0.9, 0.05]);
      for (let i = 0; i < 3; i++)
        k.add(
          SHAPES.CONE4,
          "#efb66f",
          [f.x - 0.45 + i * 0.45, 0.4, f.z + 0.57],
          [0.22, 0.6, 0.1],
        );
      k.box("#a4a0a1", [f.x, 1.4, f.z], [f.w + 0.15, 0.18, f.d + 0.1]);
    }
  }
  // Regional props stay against the walls, away from the walking loop.
  for (let i = 0; i < 5; i++) {
    const z = -4 + i * 1.45;
    if (s.region === "meadow") {
      k.add(SHAPES.CYL6, "#a17c5b", [-6.7, 1.4, z], [0.23, 0.25, 0.23]);
      k.add(
        SHAPES.BUSH,
        r.helper ? "#88b07c" : "#6d9474",
        [-6.7, 1.7, z],
        [0.3, 0.35, 0.3],
      );
    } else if (s.region === "canyon")
      k.add(
        SHAPES.ROCK,
        i % 2 ? "#dbaf73" : "#a87461",
        [-6.85, 1.8, z],
        [0.18, 0.3, 0.35],
      );
    else k.box(i % 2 ? s.color : "#ceb390", [-6.91, 2, z], [0.08, 0.65, 0.9]);
  }
  if (r.keepsake === "banner") {
    k.box(s.color, [-1.2, 2.35, -7.25], [1, 1.45, 0.05]);
    k.add(SHAPES.CONE4, "#ebd9a1", [-1.2, 2.4, -7.19], [0.3, 0.65, 0.03]);
  }
  if (r.keepsake === "lantern") {
    k.box("#7f6753", [-1.2, 2.45, -7.16], [0.7, 0.85, 0.38]);
    k.box("#f7d291", [-1.2, 2.45, -6.95], [0.5, 0.6, 0.05]);
  }
  return k.build();
}
