import { keySquareMapper } from "../Data/state.js";

// ─── Square / piece lookup helpers ───────────────────────────────────────────

export function getSquare(id) {
  return keySquareMapper[id] || null;
}

export function getPiece(id) {
  const sq = getSquare(id);
  return sq ? sq.piece : null;
}

export function isOpponent(id, myColor) {
  const piece = getPiece(id);
  if (!piece) return false;
  const opponentColor = myColor === "white" ? "BLACK" : "WHITE";
  return piece.piece_name.includes(opponentColor);
}

export function isFriendly(id, myColor) {
  const piece = getPiece(id);
  if (!piece) return false;
  return piece.piece_name.toLowerCase().includes(myColor);
}

export function isEmpty(id) {
  const sq = getSquare(id);
  return sq ? !sq.piece : false;
}

export function markCaptureHighlight(id) {
  const sq = getSquare(id);
  if (!sq) return;
  sq.captureHighlight = true;
  const el = document.getElementById(id);
  if (el) el.classList.add("captureColor");
}

// ─── Sliding ray generators ───────────────────────────────────────────────────

function buildRay(startId, deltaFile, deltaRank) {
  const ray = [];
  let file = startId.charCodeAt(0);
  let rank = parseInt(startId[1]);
  while (true) {
    file += deltaFile;
    rank += deltaRank;
    if (file < 97 || file > 104 || rank < 1 || rank > 8) break;
    ray.push(String.fromCharCode(file) + rank);
  }
  return ray;
}

export function getRookRays(id) {
  return {
    top:    buildRay(id,  0,  1),
    bottom: buildRay(id,  0, -1),
    right:  buildRay(id,  1,  0),
    left:   buildRay(id, -1,  0),
  };
}

export function getBishopRays(id) {
  return {
    topLeft:     buildRay(id, -1,  1),
    topRight:    buildRay(id,  1,  1),
    bottomLeft:  buildRay(id, -1, -1),
    bottomRight: buildRay(id,  1, -1),
  };
}

export function getQueenRays(id) {
  return { ...getRookRays(id), ...getBishopRays(id) };
}

// ─── Per-piece square calculators ─────────────────────────────────────────────

export function getKnightSquares(id) {
  if (!id) return [];
  const file = id.charCodeAt(0);
  const rank = parseInt(id[1]);
  const deltas = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
  return deltas
    .map(([df, dr]) => [file + df, rank + dr])
    .filter(([f, r]) => f >= 97 && f <= 104 && r >= 1 && r <= 8)
    .map(([f, r]) => String.fromCharCode(f) + r);
}

export function getKingSquares(id) {
  if (!id) return [];
  const file = id.charCodeAt(0);
  const rank = parseInt(id[1]);
  const deltas = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
  return deltas
    .map(([df, dr]) => [file + df, rank + dr])
    .filter(([f, r]) => f >= 97 && f <= 104 && r >= 1 && r <= 8)
    .map(([f, r]) => String.fromCharCode(f) + r);
}

// ─── Attack-square calculator (no DOM side effects) ───────────────────────────

export function getAttackedSquares(piece) {
  const { piece_name, current_position: pos } = piece;
  if (!pos) return [];
  const color = piece_name.includes("WHITE") ? "white" : "black";

  if (piece_name.includes("PAWN")) {
    const file = pos.charCodeAt(0);
    const rank = parseInt(pos[1]);
    const dir  = piece_name.includes("WHITE") ? 1 : -1;
    const sq   = [];
    if (file > 97)  sq.push(String.fromCharCode(file - 1) + (rank + dir));
    if (file < 104) sq.push(String.fromCharCode(file + 1) + (rank + dir));
    return sq;
  }

  if (piece_name.includes("KNIGHT")) return getKnightSquares(pos);
  if (piece_name.includes("KING"))   return getKingSquares(pos);

  const rays = piece_name.includes("ROOK")   ? Object.values(getRookRays(pos))
             : piece_name.includes("BISHOP") ? Object.values(getBishopRays(pos))
             :                                  Object.values(getQueenRays(pos));

  const attacked = [];
  for (const ray of rays) {
    for (const sq of ray) {
      attacked.push(sq);
      if (!isEmpty(sq)) break;
    }
  }
  return attacked;
}

export function getAllAttackedSquares(color, pieces) {
  const attacked = new Set();
  for (const piece of Object.values(pieces)) {
    if (!piece || !piece.current_position) continue;
    if (!piece.piece_name.toLowerCase().includes(color)) continue;
    for (const sq of getAttackedSquares(piece)) attacked.add(sq);
  }
  return attacked;
}

// ─── Check detection ──────────────────────────────────────────────────────────

export function isKingInCheck(kingColor, globalPieces) {
  const king = globalPieces[kingColor === "white" ? "white_king" : "black_king"];
  if (!king || !king.current_position) return false;
  const opponentColor = kingColor === "white" ? "black" : "white";
  return getAllAttackedSquares(opponentColor, globalPieces).has(king.current_position);
}

// ─── Candidate move generators ────────────────────────────────────────────────

function getPawnCandidates(piece, color) {
  const pos  = piece.current_position;
  const file = pos.charCodeAt(0);
  const rank = parseInt(pos[1]);
  const dir  = color === "white" ? 1 : -1;
  const startRank = color === "white" ? 2 : 7;
  const moves = [];

  const one = String.fromCharCode(file) + (rank + dir);
  if (isEmpty(one)) {
    moves.push(one);
    if (rank === startRank) {
      const two = String.fromCharCode(file) + (rank + dir * 2);
      if (isEmpty(two)) moves.push(two);
    }
  }
  for (const df of [-1, 1]) {
    const cf = file + df;
    if (cf < 97 || cf > 104) continue;
    const capSq = String.fromCharCode(cf) + (rank + dir);
    if (isOpponent(capSq, color)) moves.push(capSq);
  }
  return moves;
}

function getKingCandidates(piece, color, globalPieces) {
  const pos   = piece.current_position;
  const moves = getKingSquares(pos).filter(sq => !isFriendly(sq, color));

  if (!piece.move) {
    const opponentColor = color === "white" ? "black" : "white";
    const rank          = color === "white" ? 1 : 8;
    const attacked      = getAllAttackedSquares(opponentColor, globalPieces);

    if (!attacked.has(pos)) {
      // Queenside
      const rook1 = globalPieces[color === "white" ? "white_rook_1" : "black_rook_1"];
      if (rook1 && !rook1.move && rook1.current_position) {
        const [b, c, d] = [`b${rank}`, `c${rank}`, `d${rank}`];
        if (isEmpty(b) && isEmpty(c) && isEmpty(d) &&
            !attacked.has(c) && !attacked.has(d)) moves.push(c);
      }
      // Kingside
      const rook2 = globalPieces[color === "white" ? "white_rook_2" : "black_rook_2"];
      if (rook2 && !rook2.move && rook2.current_position) {
        const [f, g] = [`f${rank}`, `g${rank}`];
        if (isEmpty(f) && isEmpty(g) &&
            !attacked.has(f) && !attacked.has(g)) moves.push(g);
      }
    }
  }
  return moves;
}

function getCandidateMoves(piece, color, globalPieces) {
  const pos = piece.current_position;
  if (!pos) return [];
  const { piece_name } = piece;

  if (piece_name.includes("PAWN"))   return getPawnCandidates(piece, color);
  if (piece_name.includes("KNIGHT")) return getKnightSquares(pos).filter(sq => !isFriendly(sq, color));
  if (piece_name.includes("KING"))   return getKingCandidates(piece, color, globalPieces);

  const rays = piece_name.includes("ROOK")   ? Object.values(getRookRays(pos))
             : piece_name.includes("BISHOP") ? Object.values(getBishopRays(pos))
             :                                  Object.values(getQueenRays(pos));

  const moves = [];
  for (const ray of rays) {
    for (const sq of ray) {
      if (isFriendly(sq, color)) break;
      moves.push(sq);
      if (isOpponent(sq, color)) break;
    }
  }
  return moves;
}

// ─── Legal move filtering (check-safe) ───────────────────────────────────────

export function getLegalMoves(piece, color, globalPieces) {
  return getCandidateMoves(piece, color, globalPieces).filter(toId => {
    const fromId   = piece.current_position;
    const fromSq   = getSquare(fromId);
    const toSq     = getSquare(toId);
    if (!fromSq || !toSq) return false;
    const captured = toSq.piece || null;

    fromSq.piece = null;
    toSq.piece   = piece;
    piece.current_position = toId;
    if (captured) captured.current_position = null; // remove from attack calculations

    const legal = !isKingInCheck(color, globalPieces);

    piece.current_position = fromId;
    fromSq.piece = piece;
    toSq.piece   = captured;
    if (captured) captured.current_position = toId; // restore
    return legal;
  });
}

export function hasNoLegalMoves(color, globalPieces) {
  for (const piece of Object.values(globalPieces)) {
    if (!piece || !piece.current_position) continue;
    if (!piece.piece_name.toLowerCase().includes(color)) continue;
    if (getLegalMoves(piece, color, globalPieces).length > 0) return false;
  }
  return true;
}

// ─── En passant state ─────────────────────────────────────────────────────────

export let enPassantTarget = null;
export function setEnPassantTarget(id) { enPassantTarget = id; }
export function clearEnPassantTarget()  { enPassantTarget = null; }

export function getPawnCandidatesWithEnPassant(piece, color) {
  const moves = getPawnCandidates(piece, color);
  if (enPassantTarget) {
    const pos    = piece.current_position;
    const file   = pos.charCodeAt(0);
    const rank   = parseInt(pos[1]);
    const dir    = color === "white" ? 1 : -1;
    const epFile = enPassantTarget.charCodeAt(0);
    const epRank = parseInt(enPassantTarget[1]);
    if (Math.abs(file - epFile) === 1 && epRank === rank + dir) {
      moves.push(enPassantTarget);
    }
  }
  return moves;
}
