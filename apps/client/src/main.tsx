import { createRoot } from "react-dom/client";
import { Component, type ReactNode } from "react";
import App from "./App";
import { STANDALONE } from "./api";
import "./style.css";
import "./world-hud.css";
import "./town.css";
import "./haven.css";
import "./adventure.css";
import "./islands.css";
import "./battle.css";
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
