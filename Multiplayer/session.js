import { getSupabaseClient } from "./supabase.js";

// ─── Session state ───
export let myColor     = null;   
export let gameId      = null;   
export let isMultiplayer = false;

let _onMoveCallback   = null;    
let _onStatusCallback = null;    
let _subscription     = null;

// ─── Helpers ───

function generateGameId() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

// Serialize the entire board into a compact move record
export function serializeMove(fromId, toId, extraData = {}) {
  return { from: fromId, to: toId, ...extraData };
}

// ─── Create a new game (host = white) ───

export async function createGame() {
  const supabase = await getSupabaseClient();
  gameId = generateGameId();
  myColor = "white";
  isMultiplayer = true;

  const { error } = await supabase.from("games").insert({
    id: gameId,
    status: "waiting",   // waiting | active | finished
    current_turn: "white",
    moves: [],
  });

  if (error) throw new Error("Failed to create game: " + error.message);

  await _subscribe();
  return gameId;
}

// ─── Join an existing game ───

export async function joinGame(id) {
  const supabase = await getSupabaseClient();
  gameId = id.toUpperCase().trim();
  myColor = "black";
  isMultiplayer = true;

  // Check game exists and is waiting
  const { data, error } = await supabase
    .from("games")
    .select("*")
    .eq("id", gameId)
    .single();

  if (error || !data) throw new Error("Game not found. Check the code and try again.");
  if (data.status === "finished") throw new Error("This game has already ended.");
  if (data.status === "active") throw new Error("This game already has two players.");

  // Mark game as active
  await supabase
    .from("games")
    .update({ status: "active" })
    .eq("id", gameId);

  await _subscribe();
  return data;
}

// ─── send move to Supabase ───

export async function pushMove(moveData) {
  const supabase = await getSupabaseClient();

  // Append move to the moves array and flip turn
  const nextTurn = moveData.turn === "white" ? "black" : "white";

  const { error } = await supabase.from("games").update({
    moves: supabase.rpc ? undefined : undefined, 
  }).eq("id", gameId);

  // Use RPC to append to moves 
  const { error: rpcError } = await supabase.rpc("append_move", {
    game_id: gameId,
    move_data: moveData,
    next_turn: nextTurn,
  });

  if (rpcError) {
    const { data } = await supabase
      .from("games")
      .select("moves")
      .eq("id", gameId)
      .single();

    const moves = data?.moves || [];
    moves.push(moveData);

    await supabase
      .from("games")
      .update({ moves, current_turn: nextTurn })
      .eq("id", gameId);
  }
}

// ─── Mark game finished ───

export async function finishGame(result) {
  const supabase = await getSupabaseClient();
  await supabase
    .from("games")
    .update({ status: "finished", result })
    .eq("id", gameId);
}

// ─── Real-time subscription ───

async function _subscribe() {
  const supabase = await getSupabaseClient();

  _subscription = supabase
    .channel(`game:${gameId}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "games",
        filter: `id=eq.${gameId}`,
      },
      (payload) => {
        const updated = payload.new;

        // Opponent joins
        if (updated.status === "active" && _onStatusCallback) {
          _onStatusCallback("opponent_joined", updated);
        }

        // New move arrived — only process if it's not our own move
        if (updated.moves && updated.moves.length > 0) {
          const lastMove = updated.moves[updated.moves.length - 1];
          if (lastMove.color !== myColor && _onMoveCallback) {
            _onMoveCallback(lastMove);
          }
        }

        // Game dione
        if (updated.status === "finished" && _onStatusCallback) {
          _onStatusCallback("game_finished", updated);
        }
      }
    )
    .subscribe();
}

// ─── Callback registration ───

export function onOpponentMove(callback) {
  _onMoveCallback = callback;
}

export function onGameStatus(callback) {
  _onStatusCallback = callback;
}

// ─── Clean ───

export async function leaveGame() {
  if (_subscription) {
    const supabase = await getSupabaseClient();
    supabase.removeChannel(_subscription);
    _subscription = null;
  }
  gameId = null;
  myColor = null;
  isMultiplayer = false;
}
