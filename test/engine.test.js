import { test } from "node:test";
import assert from "node:assert/strict";
import { loadScript } from "./load.js";

const { createEngine } = loadScript("engine.js", ["createEngine"]);

// Standard perft positions: the number of legal move sequences must match exactly.
const PERFT = [
  ["rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", 4, 197281],
  ["r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1", 3, 97862],
  ["8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1", 5, 674624],
  ["r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1", 3, 9467],
];

for (const [fen, depth, nodes] of PERFT) {
  test(`move generator is exact: ${fen.split(" ")[0]} depth ${depth}`, () => {
    const engine = createEngine();
    engine.load(fen);
    assert.equal(engine.perft(depth), nodes);
  });
}

test("finds Scholar's Mate", () => {
  const r = createEngine().go("r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4", { depth: 3 });
  assert.equal(r.move, "h5f7");
});

test("finds a back-rank mate", () => {
  const r = createEngine().go("6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1", { depth: 3 });
  assert.equal(r.move, "d1d8");
});

test("takes a free queen", () => {
  const r = createEngine().go("rnb1kbnr/pppp1ppp/8/4p3/4P2q/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3", { depth: 3 });
  assert.equal(r.move, "f3h4");
});

test("every level returns a legal move quickly", () => {
  const engine = createEngine();
  for (const opts of [{ depth: 1, noise: 380 }, { depth: 2, noise: 140 }, { depth: 3, noise: 40 }, { depth: 7, timeMs: 300 }]) {
    const started = Date.now();
    const r = engine.go("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", opts);
    assert.match(r.move, /^[a-h][1-8][a-h][1-8]$/);
    assert.ok(Date.now() - started < 3000);
  }
});

test("reports no move when checkmated", () => {
  const r = createEngine().go("rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3", { depth: 2 });
  assert.equal(r.move, null);
});
