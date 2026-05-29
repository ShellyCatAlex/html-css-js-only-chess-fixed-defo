import { getSupabaseClient } from "./supabase.js";

export let myColor     = null;
export let gameId      = null;
export let isMultiplayer = false;

let _onMoveCallback   = null;
let _onStatusCallback = null;
let _subscription     = null;
let _opponentJoinedFired = false;

function generateGameId() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export async function createGame() {
  const supabase = await getSupabaseClient();
  gameId = generateGameId();
  myColor = "white";
  isMultiplayer = true;
  _opponentJoinedFired = false;

  const { error } = await supabase.from("games").insert({
    id: gameId,
    status: "waiting",
    current_turn: "white",
    moves: [],
  });

  if (error) throw new Error("Failed to create game: " + error.message);
  await _subscribe();
  return gameId;
}

export async function joinGame(id) {
  const supabase = await getSupabaseClient();
  gameId = id.toUpperCase().trim();
  myColor = "black";
  isMultiplayer = true;

  const { data, error } = await supabase
    .from("games")
    .select("*")
    .eq("id", gameId)
    .single();

  if (error || !data) throw new Error("Game not found. Check the code and try again.");
  if (data.status === "finished") throw new Error("This game has already ended.");
  if (data.status === "active") throw new Error("This game already has two players.");

  await supabase.from("games").update({ status: "active" }).eq("id", gameId);
  await _subscribe();
  return data;
}

export async function pushMove(moveData) {
  const supabase = await getSupabaseClient();
  const nextTurn = moveData.color === "white" ? "black" : "white";

  // Try RPC first, fall back to fetch-append-update
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

export async function finishGame(result) {
  const supabase = await getSupabaseClient();
  await supabase.from("games").update({ status: "finished", result }).eq("id", gameId);
}

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

        // Opponent joined — only fire once
        if (
          updated.status === "active" &&
          !_opponentJoinedFired &&
          _onStatusCallback
        ) {
          _opponentJoinedFired = true;
          _onStatusCallback("opponent_joined", updated);
        }

        // New move from opponent
        if (updated.moves && updated.moves.length > 0) {
          const lastMove = updated.moves[updated.moves.length - 1];
          if (lastMove.color !== myColor && _onMoveCallback) {
            _onMoveCallback(lastMove);
          }
        }

        // Game finished
        if (updated.status === "finished" && _onStatusCallback) {
          _onStatusCallback("game_finished", updated);
        }
      }
    )
    .subscribe();
}

export function onOpponentMove(callback) {
  _onMoveCallback = callback;
}

export function onGameStatus(callback) {
  _onStatusCallback = callback;
}

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
