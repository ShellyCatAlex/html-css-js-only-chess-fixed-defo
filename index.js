import { initGameRender, flipBoardForBlack } from "./Render/main.js";
import { GlobalEvent } from "./Events/global.js";
import { globalState } from "./Data/state.js";
import { showLobby, getGameCodeFromUrl, buildAppShell, showMultiplayerBadge } from "./Multiplayer/lobby.js";
import { joinGame } from "./Multiplayer/session.js";


async function boot() {
  const urlCode = getGameCodeFromUrl();
  let mode = "solo";
  let playerColor = "white";

  if (urlCode) {
    // challenge link — 
    try {
      await joinGame(urlCode);
      mode = "multiplayer";
      playerColor = "black";
      buildAppShell(); // set up #root before initGameRender
    } catch {
      // Invalid/expired link — fall through to lobby
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
if (playerColor === "black") flipBoardForBlack();
GlobalEvent(playerColor);

  if (mode === "multiplayer") {
    const session = await import("./Multiplayer/session.js");
    showMultiplayerBadge(session.myColor, session.gameId);
    session.onOpponentMove((move) => {
      document.dispatchEvent(new CustomEvent("opponent-move", { detail: move }));
    });
  }
}

boot();

