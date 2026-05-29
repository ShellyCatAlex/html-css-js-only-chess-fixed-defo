import * as pieceFactory from "../Data/pieces.js";
import { getRootDiv } from "../Helper/constants.js";
import { globalState } from "../Data/state.js";

export const globalPiece = {};

export function initGameRender(data) {
  const ROOT_DIV = getRootDiv();
ROOT_DIV.innerHTML = "";

  const boardWrapper = document.createElement("div");
  boardWrapper.id = "board-wrapper";

  boardWrapper.appendChild(makeFileLabels());

  const boardAndRanks = document.createElement("div");
  boardAndRanks.classList.add("board-and-ranks");

  const rankLabelsLeft  = document.createElement("div");
  rankLabelsLeft.classList.add("rank-labels");
  const rankLabelsRight = document.createElement("div");
  rankLabelsRight.classList.add("rank-labels");
  const boardEl = document.createElement("div");
  boardEl.id = "board";

  for (let r = 8; r >= 1; r--) {
    const s1 = document.createElement("span");
    s1.classList.add("rank-label");
    s1.textContent = r;
    rankLabelsLeft.appendChild(s1);

    const s2 = document.createElement("span");
    s2.classList.add("rank-label");
    s2.textContent = r;
    rankLabelsRight.appendChild(s2);
  }

  data.forEach((row) => {
    const rowEl = document.createElement("div");
    rowEl.classList.add("squareRow");
    row.forEach((square) => {
      const div = document.createElement("div");
      div.id = square.id;
      div.classList.add(square.color, "square");
      rowEl.appendChild(div);
    });
    boardEl.appendChild(rowEl);
  });

  boardAndRanks.appendChild(rankLabelsLeft);
  boardAndRanks.appendChild(boardEl);
  boardAndRanks.appendChild(rankLabelsRight);

  boardWrapper.appendChild(boardAndRanks);
  boardWrapper.appendChild(makeFileLabels());
  getRootDiv().appendChild(boardWrapper);

  placePieces(data);
}

function makeFileLabels() {
  const row = document.createElement("div");
  row.classList.add("file-labels");
  ["a","b","c","d","e","f","g","h"].forEach(f => {
    const span = document.createElement("span");
    span.classList.add("file-label");
    span.textContent = f;
    row.appendChild(span);
  });
  return row;
}

function placePieces(data) {
  const placements = [
    { id: "a8", factory: "blackRook",   key: "black_rook_1" },
    { id: "b8", factory: "blackKnight", key: "black_knight_1" },
    { id: "c8", factory: "blackBishop", key: "black_bishop_1" },
    { id: "d8", factory: "blackQueen",  key: "black_queen" },
    { id: "e8", factory: "blackKing",   key: "black_king" },
    { id: "f8", factory: "blackBishop", key: "black_bishop_2" },
    { id: "g8", factory: "blackKnight", key: "black_knight_2" },
    { id: "h8", factory: "blackRook",   key: "black_rook_2" },
    { id: "a1", factory: "whiteRook",   key: "white_rook_1" },
    { id: "b1", factory: "whiteKnight", key: "white_knight_1" },
    { id: "c1", factory: "whiteBishop", key: "white_bishop_1" },
    { id: "d1", factory: "whiteQueen",  key: "white_queen" },
    { id: "e1", factory: "whiteKing",   key: "white_king" },
    { id: "f1", factory: "whiteBishop", key: "white_bishop_2" },
    { id: "g1", factory: "whiteKnight", key: "white_knight_2" },
    { id: "h1", factory: "whiteRook",   key: "white_rook_2" },
  ];

  placements.forEach(({ id, factory, key }) => {
    const square = data.flat().find(sq => sq.id === id);
    square.piece = pieceFactory[factory](id);
    globalPiece[key] = square.piece;
  });

  data.flat().filter(sq => sq.id[1] === "7").forEach(sq => {
    sq.piece = pieceFactory.blackPawn(sq.id);
    globalPiece[`black_pawn_${sq.id[0]}`] = sq.piece;
  });
  data.flat().filter(sq => sq.id[1] === "2").forEach(sq => {
    sq.piece = pieceFactory.whitePawn(sq.id);
    globalPiece[`white_pawn_${sq.id[0]}`] = sq.piece;
  });

  data.flat().forEach(sq => {
    if (sq.piece) {
      const el  = document.getElementById(sq.id);
      const img = document.createElement("img");
      img.src = sq.piece.img;
      img.classList.add("piece");
      el.appendChild(img);
    }
  });
}

export function renderBoardHighlights() {
  globalState.flat().forEach((el) => {
    const domEl = document.getElementById(el.id);
    if (!domEl) return;
    domEl.querySelectorAll("span.highlight").forEach(s => s.remove());
    if (el.highlight) {
      const span = document.createElement("span");
      span.classList.add("highlight");
      domEl.appendChild(span);
    }
  });
}

export function selfHighlight(piece) {
  document.getElementById(piece.current_position)?.classList.add("highlightYellow");
}

export function clearSelfHighlight(piece) {
  if (piece?.current_position) {
    document.getElementById(piece.current_position)?.classList.remove("highlightYellow");
  }
}

export function clearAllHighlights() {
  globalState.flat().forEach((el) => {
    if (el.captureHighlight) {
      document.getElementById(el.id)?.classList.remove("captureColor");
      el.captureHighlight = false;
    }
    if (el.highlight) el.highlight = false;
  });
  renderBoardHighlights();
}

export function updateStatus(inTurn, checkState) {
  const bar = document.getElementById("status-bar");
  if (!bar) return;
  const name = inTurn.charAt(0).toUpperCase() + inTurn.slice(1);
  if (checkState === "checkmate") {
    const winner = inTurn === "white" ? "Black" : "White";
    bar.textContent = `Checkmate! ${winner} wins!`;
    bar.className = "status-bar checkmate";
  } else if (checkState === "stalemate") {
    bar.textContent = "Stalemate — it's a draw!";
    bar.className = "status-bar stalemate";
  } else if (checkState === "check") {
    bar.textContent = `${name} is in check!`;
    bar.className = "status-bar in-check";
    highlightKing(inTurn);
  } else {
    bar.textContent = `${name}'s turn`;
    bar.className = "status-bar";
    clearKingHighlight();
  }
}

function highlightKing(color) {
  clearKingHighlight();
  const king = globalPiece[color === "white" ? "white_king" : "black_king"];
  if (king?.current_position) {
    document.getElementById(king.current_position)?.classList.add("inCheck");
  }
}

function clearKingHighlight() {
  document.querySelectorAll(".inCheck").forEach(el => el.classList.remove("inCheck"));
}

export function renderPieceMove(fromId, toId) {
  const fromEl = document.getElementById(fromId);
  const toEl   = document.getElementById(toId);
  if (!fromEl || !toEl) return;
  toEl.innerHTML   = fromEl.innerHTML;
  fromEl.innerHTML = "";
}

export function renderPieceAt(piece, id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = "";
  const img = document.createElement("img");
  img.src = piece.img;
  img.classList.add("piece");
  el.appendChild(img);
}

export function clearSquare(id) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = "";
}

export function flipBoardForBlack() {
  // Reverse the row order in the board
  const board = document.getElementById("board");
  if (!board) return;
  const rows = Array.from(board.children);
  rows.reverse().forEach(row => {
    // Also reverse squares within each row
    const squares = Array.from(row.children);
    squares.reverse().forEach(sq => row.appendChild(sq));
    board.appendChild(row);
  });

  // Flip rank labels (both sides)
  document.querySelectorAll(".rank-labels").forEach(col => {
    const labels = Array.from(col.children);
    labels.reverse().forEach(l => col.appendChild(l));
  });

  // Flip file labels (both rows)
  document.querySelectorAll(".file-labels").forEach(row => {
    const labels = Array.from(row.children);
    labels.reverse().forEach(l => row.appendChild(l));
  });
}
