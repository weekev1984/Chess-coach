// The engine and coaching notes are plain browser scripts; load them into a sandbox for testing.
import { readFileSync } from "node:fs";
import vm from "node:vm";

export function loadScript(file, names) {
  const code = readFileSync(new URL(`../public/${file}`, import.meta.url), "utf8");
  return vm.runInNewContext(`${code}\n;({ ${names.join(", ")} })`, { Date, Math, Map });
}
