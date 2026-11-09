import { createRoot } from "react-dom/client";
import { Component, type ReactNode } from "react";
import App from "./App";
import { STANDALONE } from "./api";
import { startGamepad } from "./gamepad";
import "./install-prompt";
import { watchErrors } from "./diagnostics";
import { startKeybinds } from "./keybinds";
import "./style.css";
import "./world-hud.css";
import "./town.css";
import "./haven.css";
import "./adventure.css";
import "./islands.css";
import "./battle.css";
startGamepad();
watchErrors();
startKeybinds();
// The online build has no server, so it can keep playing without a connection.
if (import.meta.env.PROD && STANDALONE && "serviceWorker" in navigator) {
  // A new version takes over in the background; say so, unless this is the
  // very first visit, when the worker taking charge is nothing new.
  const hadWorker = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (hadWorker) dispatchEvent(new Event("mythoveya-updated"));
  });
  addEventListener("load", () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`)
      .then((r) => {
        // Long sessions check for a new version every half hour.
        setInterval(() => r.update().catch(() => {}), 30 * 60 * 1000);
      })
      .catch(() => {});
  });
}
// A tab left open across an update asks for script files that are gone. Reload
// once to pick up the new ones; a second failure soon after is a real problem
// and goes to the error screen below.
window.addEventListener("vite:preloadError", (e) => {
  const key = "mythoveya-update-reload",
    last = Number(sessionStorage.getItem(key) || 0);
  if (Date.now() - last < 60000) return;
  sessionStorage.setItem(key, String(Date.now()));
  e.preventDefault();
  location.reload();
});
class Boundary extends Component<{ children: ReactNode }, { error: string }> {
  state = { error: "" };
  static getDerivedStateFromError(e: Error) {
    return { error: e.message };
  }
  render() {
    return this.state.error ? (
      <div className="panel fatal">
        <h1>The rift needs a moment.</h1>
        <p>{this.state.error}</p>
        <p>
          {STANDALONE
            ? "Make sure hardware acceleration is enabled, then reload."
            : "Make sure hardware acceleration is enabled and the local server is running."}
        </p>
        <button onClick={() => location.reload()}>Reload game</button>
      </div>
    ) : (
      this.props.children
    );
  }
}
function webglAvailable() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}
createRoot(document.getElementById("root")!).render(
  webglAvailable() ? (
    <Boundary>
      <App />
    </Boundary>
  ) : (
    <div className="panel fatal" role="alert">
      <h1>Mythoveya needs 3D graphics.</h1>
      <p>
        This browser could not start WebGL, which draws the world and its
        creatures.
      </p>
      <p>
        Turn on hardware acceleration in your browser settings, update your
        graphics driver, or try a current version of Chrome, Edge, Firefox or
        Safari, then reload.
      </p>
      <button onClick={() => location.reload()}>Reload game</button>
    </div>
  ),
);
