import { initGame } from "./data.js";

// Single source of truth for board state — imported by all modules
// This file imports nothing from the rest of the app, breaking all circular deps.

export const globalState = initGame();

export const keySquareMapper = {};
globalState.flat().forEach((square) => {
  keySquareMapper[square.id] = square;
});
