// Rebuilds public/openings.json from the lichess chess-openings TSV files in data/.
// Each entry is [eco, name, moves in SAN separated by spaces, EPD of the final position].
// Get fresh TSVs from https://github.com/lichess-org/chess-openings (a.tsv to e.tsv).
import { readFileSync, writeFileSync } from "node:fs";
import { Chess } from "../public/vendor/chess.js";

const out = [];
for (const f of "abcde") {
  const lines = readFileSync(new URL(`../data/${f}.tsv`, import.meta.url), "utf8").trim().split("\n").slice(1);
  for (const line of lines) {
    const [eco, name, pgn] = line.split("\t");
    const sans = pgn.replace(/\d+\.(\.\.)?/g, " ").trim().split(/\s+/);
    const chess = new Chess();
    for (const san of sans) chess.move(san);
    out.push([eco, name, sans.join(" "), chess.fen().split(" ").slice(0, 4).join(" ")]);
  }
}
writeFileSync(new URL("../public/openings.json", import.meta.url), JSON.stringify(out));
console.log(`Wrote ${out.length} openings`);
