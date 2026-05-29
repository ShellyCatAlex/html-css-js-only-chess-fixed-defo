import {
  blackBishop, blackKnight, blackRook, blackQueen,
  whiteQueen, whiteRook, whiteKnight, whiteBishop,
} from "../Data/pieces.js";

class ModalCreator {
  constructor(body) {
    this.open = false;
    this.body = body;
  }
  show() {
    this.open = true;
    document.body.appendChild(this.body);
    document.getElementById("root").classList.add("blur");
  }
  hide() {
    this.open = false;
    document.body.removeChild(this.body);
    document.getElementById("root").classList.remove("blur");
  }
}

export function pawnPromotion(color, callback, id) {
  const pieces = [
    { name: "queen",  factory: color === "white" ? whiteQueen  : blackQueen  },
    { name: "rook",   factory: color === "white" ? whiteRook   : blackRook   },
    { name: "knight", factory: color === "white" ? whiteKnight : blackKnight },
    { name: "bishop", factory: color === "white" ? whiteBishop : blackBishop },
  ];

  const imageContainer = document.createElement("div");
  imageContainer.classList.add("modal-pieces");

  const msg = document.createElement("p");
  msg.textContent = "Pawn promoted! Choose a piece:";

  const finalContainer = document.createElement("div");
  finalContainer.appendChild(msg);
  finalContainer.appendChild(imageContainer);
  finalContainer.classList.add("modal");

  const modal = new ModalCreator(finalContainer);
  modal.show();

  pieces.forEach(({ name, factory }) => {
    const img = document.createElement("img");
    img.src = `Assets/images/pieces/${color}/${name}.png`;
    img.onclick = () => {
      callback(factory, id);
      modal.hide();
    };
    imageContainer.appendChild(img);
  });
}

export default pawnPromotion;
