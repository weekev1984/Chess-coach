import { test } from "node:test";
import assert from "node:assert/strict";
import { loadScript } from "./load.js";

const { moveWords, plainMoves } = loadScript("notation.js", ["moveWords", "plainMoves"]);

test("moves read as plain words", () => {
  assert.equal(moveWords("Nf3"), "knight to f3");
  assert.equal(moveWords("exd5"), "pawn takes on d5");
  assert.equal(moveWords("Qxf7#"), "queen takes on f7, checkmate");
  assert.equal(moveWords("Bb4+"), "bishop to b4 with check");
  assert.equal(moveWords("O-O-O"), "castle queenside");
  assert.equal(moveWords("e8=Q"), "pawn to e8 and becomes a queen");
  assert.equal(moveWords("Nbd2"), "knight to d2");
});

test("notation in text becomes words, squares and tags stay", () => {
  assert.equal(plainMoves("1.e4 e5 2.Nf3 Nc6. White pokes."), "Pawn to e4, pawn to e5, knight to f3, knight to c6. White pokes.");
  assert.equal(plainMoves("Kick it with ...a6, then Re1 and O-O."), "Kick it with pawn to a6, then rook to e1 and castle kingside.");
  assert.equal(plainMoves('<p><span class="san">g6</span> attacks the e5 pawn.</p>'), "<p><b>Pawn to g6</b> attacks the e5 pawn.</p>");
  assert.equal(plainMoves('<button data-k="1">Nf3, developing</button>'), '<button data-k="1">Knight to f3, developing</button>');
  assert.equal(plainMoves("ECO B02 and C50 stay, as does the f7 square."), "ECO B02 and C50 stay, as does the f7 square.");
});
