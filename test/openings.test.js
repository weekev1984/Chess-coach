import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Chess } from "../public/vendor/chess.js";
import { loadScript } from "./load.js";

const OPENINGS = JSON.parse(readFileSync(new URL("../public/openings.json", import.meta.url), "utf8"));
const { COACH, ECO_GENERAL, coachFamily } = loadScript("coach.js", ["COACH", "ECO_GENERAL", "coachFamily"]);

test("has the full lichess openings list", () => {
  assert.equal(OPENINGS.length, 3865);
});

test("every opening's moves are legal and match its stored position", () => {
  for (const [eco, name, moves, epd] of OPENINGS) {
    const chess = new Chess();
    for (const san of moves.split(" ")) chess.move(san);
    assert.equal(chess.fen().split(" ").slice(0, 4).join(" "), epd, `${eco} ${name}`);
  }
});

test("each position names only one opening (so identification is unambiguous)", () => {
  assert.equal(new Set(OPENINGS.map((o) => o[3])).size, OPENINGS.length);
});

test("every opening gets coaching: its own family notes or the ECO group's", () => {
  for (const [eco, name] of OPENINGS) {
    assert.ok(COACH[coachFamily(name)] || ECO_GENERAL[eco[0]], name);
  }
});

test("the big families have their own notes", () => {
  const counts = {};
  for (const [, name] of OPENINGS) counts[name.split(":")[0]] = (counts[name.split(":")[0]] || 0) + 1;
  const missing = Object.entries(counts).filter(([, n]) => n >= 10).map(([f]) => f).filter((f) => !COACH[coachFamily(f)]);
  assert.deepEqual(missing, []);
});

test("family lookup handles variations, Accepted/Declined and 'with' names", () => {
  assert.equal(coachFamily("Sicilian Defense: Najdorf Variation"), "Sicilian Defense");
  assert.equal(coachFamily("King's Gambit Accepted: Bishop's Gambit"), "King's Gambit Accepted");
  assert.equal(coachFamily("Benko Gambit Declined: Main Line"), "Benko Gambit");
  assert.equal(coachFamily("Vienna Gambit, with Max Lange Defense"), "Vienna Gambit");
});

test("every coaching entry has all its parts", () => {
  for (const [fam, info] of Object.entries(COACH)) {
    for (const k of ["o", "s", "w", "b", "c", "t"]) assert.ok(info[k], `${fam} is missing ${k}`);
    assert.ok(["w", "b"].includes(info.o), fam);
  }
});
