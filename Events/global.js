import { getRootDiv } from "../Helper/constants.js";
import { keySquareMapper } from "../Data/state.js";
import {
  globalPiece,
  clearAllHighlights,
  selfHighlight,
  clearSelfHighlight,
  renderBoardHighlights,
  updateStatus,
  renderPieceMove,
  renderPieceAt,
  clearSquare,
} from "../Render/main.js";
import {
  getLegalMoves,
  isKingInCheck,
  hasNoLegalMoves,
  getSquare,
  isEmpty,
  isOpponent,
  isFriendly,
  markCaptureHighlight,
  getPawnCandidatesWithEnPassant,
  enPassantTarget,
  setEnPassantTarget,
  clearEnPassantTarget,
} from "../Helper/commonHelper.js";
import pawnPromotion from "../Helper/modalCreator.js";

let inTurn    = "white";
let selectedPiece = null;
let gameOver  = false;

function changeTurn() {
  inTurn = inTurn === "white" ? "black" : "white";
}

// ─── Legality helpers ───

function isLegalAfterMove(piece, toId, color) {
  const fromId   = piece.current_position;
  const fromSq   = getSquare(fromId);
  const toSq     = getSquare(toId);
  if (!fromSq || !toSq) return false;
  const captured = toSq.piece || null;

  fromSq.piece = null;
  toSq.piece   = piece;
  piece.current_position = toId;
  if (captured) captured.current_position = null;

  const legal  = !isKingInCheck(color, globalPiece);

  piece.current_position = fromId;
  fromSq.piece = piece;
  toSq.piece   = captured;
  if (captured) captured.current_position = toId;
  return legal;
}

function isEnPassantLegal(pawn, epSquare, color) {
  const fromSq  = getSquare(pawn.current_position);
  const toSq    = getSquare(epSquare);
  if (!fromSq || !toSq) return false;
  const capSq   = getSquare(epSquare[0] + pawn.current_position[1]);
  if (!capSq) return false;
  const capPiece = capSq.piece;
  const prevPos  = pawn.current_position;

  fromSq.piece = null;
  toSq.piece   = pawn;
  pawn.current_position = epSquare;
  capSq.piece  = null;
  const legal  = !isKingInCheck(color, globalPiece);
  pawn.current_position = prevPos;
  fromSq.piece = pawn;
  toSq.piece   = null;
  capSq.piece  = capPiece;
  return legal;
}

// ─── Highlight available moves ────

function highlightLegalMoves(piece, color) {
  let moves;
  if (piece.piece_name.includes("PAWN")) {
    const candidates = getPawnCandidatesWithEnPassant(piece, color);
    moves = candidates.filter(toId =>
      toId === enPassantTarget
        ? isEnPassantLegal(piece, toId, color)
        : isLegalAfterMove(piece, toId, color)
    );
  } else {
    moves = getLegalMoves(piece, color, globalPiece);
  }

  moves.forEach(sq => {
    const square = keySquareMapper[sq];
    if (!square) return;
    if (square.piece) {
      square.captureHighlight = true;
      markCaptureHighlight(sq);
    } else {
      square.highlight = true;
    }
  });

  renderBoardHighlights();
}

// ─── Execute a move ───

function executeMove(piece, toId) {
  const fromId = piece.current_position;
  const fromSq = getSquare(fromId);
  const toSq   = getSquare(toId);
  if (!fromSq || !toSq) return;

  let newEnPassantTarget = null;

  // En passant
  if (piece.piece_name.includes("PAWN") && toId === enPassantTarget) {
    const capSq = getSquare(toId[0] + fromId[1]);
    if (capSq?.piece) {
      capSq.piece.current_position = null;
      capSq.piece = null;
      clearSquare(toId[0] + fromId[1]);
    }
  }

  // Double pawn push en passant
  if (piece.piece_name.includes("PAWN")) {
    const rf = parseInt(fromId[1]), rt = parseInt(toId[1]);
    if (Math.abs(rt - rf) === 2) {
      newEnPassantTarget = toId[0] + (rt + (rt > rf ? -1 : 1));
    }
  }

  // Castling move rook too
  if (piece.piece_name.includes("KING")) {
    const delta = toId.charCodeAt(0) - fromId.charCodeAt(0);
    if (Math.abs(delta) === 2) {
      const rank      = fromId[1];
      const kingside  = delta > 0;
      const rfrom     = (kingside ? "h" : "a") + rank;
      const rto       = (kingside ? "f" : "d") + rank;
      const rFromSq   = getSquare(rfrom);
      const rToSq     = getSquare(rto);
      if (rFromSq?.piece && rToSq) {
        const rook = rFromSq.piece;
        rToSq.piece = rook;
        rook.current_position = rto;
        rook.move = true;
        rFromSq.piece = null;
        renderPieceMove(rfrom, rto);
      }
    }
    piece.move = true;
  }

  if (piece.piece_name.includes("ROOK")) piece.move = true;

  const captured = toSq.piece;
  if (captured) captured.current_position = null;
  fromSq.piece = null;
  toSq.piece   = piece;
  piece.current_position = toId;

  renderPieceMove(fromId, toId);
  setEnPassantTarget(newEnPassantTarget);

  // Pawn promotion
  if (piece.piece_name.includes("PAWN")) {
    const promRank = piece.piece_name.includes("WHITE") ? "8" : "1";
    if (toId[1] === promRank) {
      pawnPromotion(inTurn, promotionCallback, toId);
      return; // finishTurn called after piece is chosen
    }
  }

  finishTurn();
}

function promotionCallback(factory, id) {
  const sq = getSquare(id);
  if (!sq) return;
  const newPiece = factory(id);
  sq.piece = newPiece;
  globalPiece[`promoted_${id}_${Date.now()}`] = newPiece;
  renderPieceAt(newPiece, id);
  finishTurn();
}

function finishTurn() {
  changeTurn();
  const inCheck = isKingInCheck(inTurn, globalPiece);
  const noMoves = hasNoLegalMoves(inTurn, globalPiece);
  if (noMoves) {
    gameOver = true;
    updateStatus(inTurn, inCheck ? "checkmate" : "stalemate");
    return;
  }
  updateStatus(inTurn, inCheck ? "check" : null);
}

// ─── Click handler ────────────────────────────────────────────────────────────

function handleSquareClick(squareId) {
  if (gameOver) return;
  const square = keySquareMapper[squareId];
  if (!square) return;

  // Destination click (move or capture)
  if ((square.highlight || square.captureHighlight) && selectedPiece) {
    clearSelfHighlight(selectedPiece);
    clearAllHighlights();
    executeMove(selectedPiece, squareId);
    selectedPiece = null;
    return;
  }

  // Own piece click
  if (square.piece) {
    const pieceColor = square.piece.piece_name.includes("WHITE") ? "white" : "black";
    if (pieceColor !== inTurn) return;

    if (selectedPiece === square.piece) {
      clearSelfHighlight(selectedPiece);
      clearAllHighlights();
      selectedPiece = null;
      return;
    }

    if (selectedPiece) {
      clearSelfHighlight(selectedPiece);
      clearAllHighlights();
    }

    selectedPiece = square.piece;
    selfHighlight(selectedPiece);
    highlightLegalMoves(selectedPiece, inTurn);
    return;
  }

  // Empty square — deselect
  if (selectedPiece) {
    clearSelfHighlight(selectedPiece);
    clearAllHighlights();
    selectedPiece = null;
  }
}

// ─── Event wiring ─────────────────────────────────────────────────────────────

export function GlobalEvent() {
  getRootDiv().addEventListener("click", (event) => {
    let el = event.target;
    while (el && el !== getRootDiv()) {
      if (el.classList?.contains("square")) {
        handleSquareClick(el.id);
        return;
      }
      el = el.parentElement;
    }
  });

  document.getElementById("new-game-btn")?.addEventListener("click", () => {
    window.location.reload();
  });
}
