function Square(color, id, piece) {
  return { color, id, piece };
}

function SquareRow(rowId) {
  const squareRow = [];
  const files = ["a", "b", "c", "d", "e", "f", "g", "h"];

  files.forEach((file, index) => {
    const isEvenRow = rowId % 2 === 0;
    const isEvenCol = index % 2 === 0;
    const color = (isEvenRow === isEvenCol) ? "white" : "black";
    squareRow.push(Square(color, file + rowId, null));
  });

  return squareRow;
}

function initGame() {
  return [
    SquareRow(8), SquareRow(7), SquareRow(6), SquareRow(5),
    SquareRow(4), SquareRow(3), SquareRow(2), SquareRow(1),
  ];
}

export { initGame };
