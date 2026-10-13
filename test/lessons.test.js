import { test } from "node:test";
import assert from "node:assert/strict";
import { Chess } from "../public/vendor/chess.js";
import { loadScript } from "./load.js";

const { LESSONS } = loadScript("lessons.js", ["LESSONS"]);
const { createEngine } = loadScript("engine.js", ["createEngine"]);
const MATE = 100000;
const EXERCISES = LESSONS.flatMap((u) => u.lessons.flatMap((l) => l.ex.map((ex, i) => ({ ...ex, id: `${l.id}-${i}` }))));
const clean = (s) => s.replace(/[+#!?]/g, "");

function startPosition(ex) {
  const chess = new Chess(ex.fen);
  for (const san of (ex.setup || "").split(" ").filter(Boolean)) chess.move(san);
  return chess;
}

test("lesson ids are unique and every lesson has an intro and exercises", () => {
  const ids = LESSONS.flatMap((u) => u.lessons.map((l) => l.id));
  assert.equal(new Set(ids).size, ids.length);
  for (const u of LESSONS) for (const l of u.lessons) {
    assert.ok(l.title && l.intro.length && l.ex.length, l.id);
  }
});

test("every exercise is well formed and every move in it is legal", () => {
  for (const ex of EXERCISES) {
    const chess = startPosition(ex);
    assert.ok(ex.prompt, ex.id);
    if (ex.type === "choice") {
      assert.ok(ex.answer >= 0 && ex.answer < ex.options.length, ex.id);
      assert.ok(ex.explain, ex.id);
      continue;
    }
    assert.ok(["move", "line"].includes(ex.type), ex.id);
    assert.equal(ex.solution.length % 2, 1, `${ex.id}: the solution must end with the player's move`);
    ex.solution.forEach((step, i) => {
      const alts = step.split("|");
      if (alts.length > 1) assert.equal(i, ex.solution.length - 1, `${ex.id}: alternatives only on the last step`);
      for (const alt of alts) {
        const played = new Chess(chess.fen()).move(alt);
        assert.equal(clean(played.san), clean(alt), `${ex.id}: ${alt} is written as ${played.san}`);
        if (ex.goal === "mate" && i === ex.solution.length - 1) {
          const after = new Chess(chess.fen()); after.move(alt);
          assert.ok(after.isCheckmate(), `${ex.id}: ${alt} should be checkmate`);
        }
      }
      chess.move(alts[0]);
    });
  }
});

test("the engine agrees with every 'find the move' answer", () => {
  const engine = createEngine();
  const problems = [];
  for (const ex of EXERCISES.filter((e) => e.type === "move" && !e.book)) {
    const chess = startPosition(ex);
    ex.solution.forEach((step, i) => {
      if (i % 2 === 0) {
        const best = engine.go(chess.fen(), { depth: 7, timeMs: 1500 }).bestScore;
        for (const alt of step.split("|")) {
          const after = new Chess(chess.fen()); after.move(alt);
          const r = after.isGameOver() ? { bestScore: after.isCheckmate() ? -MATE : 0 } : engine.go(after.fen(), { depth: 6, timeMs: 1500 });
          const mine = -r.bestScore;
          const ok = best > MATE - 1000 ? mine > MATE - 1000 : mine >= best - 90;
          if (!ok) problems.push(`${ex.id}: ${alt} scores ${mine}, best is ${best}`);
        }
      }
      chess.move(step.split("|")[0]);
    });
  }
  assert.deepEqual(problems, []);
});
