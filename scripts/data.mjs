// Reads and writes data/nodes.json in one format: 2-space JSON, pos.edge on one line.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { root } from "./serve.mjs";

export const dataFile = join(root, "data", "nodes.json");

export const readData = () => JSON.parse(readFileSync(dataFile, "utf8"));

// Returns true when the file changed.
export function writeData(data) {
  const json = JSON.stringify(data, null, 2).replace(/"edge": \[\s+(-?\d+),\s+(-?\d+)\s+\]/g, '"edge": [$1, $2]') + "\n";
  if (json === readFileSync(dataFile, "utf8")) return false;
  writeFileSync(dataFile, json);
  return true;
}
