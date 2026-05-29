import {
  createGame,
  joinGame,
  onOpponentMove,
  onGameStatus,
  myColor,
  gameId,
  isMultiplayer,
} from "./session.js";

// ─── Called by index.js on page load ───
// Returns a promise that resolves with { mode, color } once the player
// has either started a solo game, created a multiplayer game, or joined one.

export function showLobby() {
  return new Promise((resolve) => {
    const app = document.getElementById("app");

    // ── Build lobby UI ───
    const lobby = document.createElement("div");
    lobby.id = "lobby";
    lobby.innerHTML = `
      <div class="lobby-card">
        <h1 class="lobby-title">Chess</h1>

        <button id="solo-btn" class="lobby-btn primary">Play Solo (Local)</button>

        <div class="lobby-divider"><span>or</span></div>

        <button id="create-btn" class="lobby-btn secondary">Challenge a Friend</button>

        <div class="lobby-join">
          <input id="join-input" type="text" placeholder="Enter game code" maxlength="6" />
          <button id="join-btn" class="lobby-btn secondary">Join Game</button>
        </div>

        <p id="lobby-error" class="lobby-error"></p>
      </div>
    `;

    app.innerHTML = "";
    app.appendChild(lobby);

    // ─── Solo ───
    document.getElementById("solo-btn").onclick = () => {
      hideLobby();
      resolve({ mode: "solo", color: "white" });
    };

    // ─── host ───
    document.getElementById("create-btn").onclick = async () => {
      setLobbyError("");
      const btn = document.getElementById("create-btn");
      btn.textContent = "Creating…";
      btn.disabled = true;

      try {
        const id = await createGame();
        showWaitingRoom(id, resolve);
      } catch (err) {
        setLobbyError(err.message);
        btn.textContent = "Challenge a Friend";
        btn.disabled = false;
      }
    };

    // ── join ───
    document.getElementById("join-btn").onclick = async () => {
      const code = document.getElementById("join-input").value.trim();
      if (!code) { setLobbyError("Please enter a game code."); return; }
      setLobbyError("");

      const btn = document.getElementById("join-btn");
      btn.textContent = "Joining…";
      btn.disabled = true;

      try {
        await joinGame(code);
        hideLobby();
        // Black sees a flipped board 
        resolve({ mode: "multiplayer", color: "black" });
      } catch (err) {
        setLobbyError(err.message);
        btn.textContent = "Join Game";
        btn.disabled = false;
      }
    };

    // Enter to enter
    document.getElementById("join-input").onkeydown = (e) => {
      if (e.key === "Enter") document.getElementById("join-btn").click();
    };
  });
}

// ─── Waiting room ───

function showWaitingRoom(id, resolve) {
  const shareUrl = `${location.origin}${location.pathname}?game=${id}`;
  const app = document.getElementById("app");

  app.innerHTML = `
    <div class="lobby-card">
      <h1 class="lobby-title">♟ Chess</h1>
      <p class="waiting-label">Your game code:</p>
      <div class="game-code">${id}</div>

      <p class="waiting-label">Or share this link:</p>
      <div class="share-row">
        <input id="share-url" class="share-input" value="${shareUrl}" readonly />
        <button id="copy-btn" class="lobby-btn secondary small">Copy</button>
      </div>

      <p class="waiting-msg" id="waiting-msg">⏳ Waiting for your friend to join…</p>
      <p id="lobby-error" class="lobby-error"></p>
    </div>
  `;

  document.getElementById("copy-btn").onclick = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      document.getElementById("copy-btn").textContent = "Copied!";
      setTimeout(() => {
        const btn = document.getElementById("copy-btn");
        if (btn) btn.textContent = "Copy";
      }, 2000);
    });
  };

  // Listen for session callback
  onGameStatus((event) => {
    if (event === "opponent_joined") {
      const msg = document.getElementById("waiting-msg");
      if (msg) msg.textContent = "✅ Friend joined! Starting game…";
      setTimeout(() => {
        hideLobby();
        resolve({ mode: "multiplayer", color: "white" });
      }, 800);
    }
  });
}

// ─── autojoin from URL  ───

export function getGameCodeFromUrl() {
  const params = new URLSearchParams(location.search);
  return params.get("game") || null;
}

// ─── Helpers ───

function hideLobby() {
  const lobby = document.getElementById("lobby");
  if (lobby) lobby.remove();

  // restore the shell of index.html
  const app = document.getElementById("app");
  app.innerHTML = `
    <h1 id="game-title"> Chess</h1>
    <div id="status-bar" class="status-bar">White's turn</div>
    <div id="root"></div>
    <button id="new-game-btn">New Game</button>
  `;
}

function setLobbyError(msg) {
  const el = document.getElementById("lobby-error");
  if (el) el.textContent = msg;
}

// ─── In-game multiplayer status overlay ───

export function showMultiplayerBadge(color, gameCode) {
  const existing = document.getElementById("mp-badge");
  if (existing) existing.remove();

  const badge = document.createElement("div");
  badge.id = "mp-badge";
  badge.innerHTML = `
    <span>You are <strong>${color}</strong></span>
    <span class="mp-code">Code: <strong>${gameCode}</strong></span>
  `;
  document.getElementById("app")?.prepend(badge);
}
