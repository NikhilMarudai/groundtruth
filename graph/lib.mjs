// Shared Neo4j connection + seed loading helpers.
import neo4j from "neo4j-driver";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SEED = join(HERE, "..", "seed", "output");

export function seed(name) {
  return JSON.parse(readFileSync(join(SEED, `${name}.json`), "utf8"));
}

export function driver() {
  const uri = process.env.NEO4J_URI;
  const user = process.env.NEO4J_USER || "neo4j";
  const password = process.env.NEO4J_PASSWORD;
  if (!uri || !password) {
    console.error(
      "Missing credentials. Set NEO4J_URI and NEO4J_PASSWORD (and optionally NEO4J_USER):\n" +
        "  NEO4J_URI='neo4j+s://xxxx.databases.neo4j.io' NEO4J_PASSWORD='...' node <script>"
    );
    process.exit(1);
  }
  return neo4j.driver(uri, neo4j.auth.basic(user, password));
}

// Reference "now" for the demo — the moment the assistant reasons about.
// Defaults to Friday evening so the thesis-stall reads as "4 days".
export const NOW = process.env.JARVIS_NOW || "2026-07-03T18:00:00";

// Which activity label confirms an intention for a given project.
export const CONFIRMING_LABEL = { p_fit: "Exercising" }; // default: "Working"
