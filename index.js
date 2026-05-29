import { initGameRender } from "./Render/main.js";
import { GlobalEvent } from "./Events/global.js";
import { globalState } from "./Data/state.js";
import { showLobby, getGameCodeFromUrl, showMultiplayerBadge } from "./Multiplayer/lobby.js";
import { joinGame, onOpponentMove, onGameStatus, myColor, gameId } from "./Multiplayer/session.js";

async function boot() {
  const urlCode = getGameCodeFromUrl();
  let mode = "solo";
  let playerColor = "white";

  if (urlCode) {
    try {
      await joinGame(urlCode);
      mode = "multiplayer";
      playerColor = "black";
      document.getElementById("app").innerHTML = `
        <h1 id="game-title">Chess</h1>
        <div id="status-bar" class="status-bar">White's turn</div>
        <div id="root"></div>
        <button id="new-game-btn">New Game</button>
      `;
    } catch {
      const result = await showLobby();
      mode = result.mode;
      playerColor = result.color;
    }
  } else {
    const result = await showLobby();
    mode = result.mode;
    playerColor = result.color;
  }

  initGameRender(globalState);
  GlobalEvent(mode === "multiplayer" ? playerColor : null);

  if (mode === "multiplayer") {
    const session = await import("./Multiplayer/session.js");
    showMultiplayerBadge(session.myColor, session.gameId);
    session.onOpponentMove((move) => {
      document.dispatchEvent(new CustomEvent("opponent-move", { detail: move }));
    });
  }
}

boot();
