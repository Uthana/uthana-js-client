import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const clientPath = join(root, "packages/client/package.json");
const reactPath = join(root, "packages/react/package.json");

const client = JSON.parse(readFileSync(clientPath, "utf8"));
const react = JSON.parse(readFileSync(reactPath, "utf8"));
const version = client.version;
if (!version || typeof version !== "string") {
  console.error("sync-versions: packages/client/package.json missing a string version");
  process.exit(1);
}

const wanted = `^${version}`;
const current = react.dependencies?.["@uthana/client"];
if (current === wanted) {
  process.exit(0);
}

react.dependencies = react.dependencies ?? {};
react.dependencies["@uthana/client"] = wanted;
writeFileSync(reactPath, `${JSON.stringify(react, null, 2)}\n`, "utf8");
console.log(`sync-versions: set @uthana/react → @uthana/client to ${wanted}`);
console.warn("sync-versions: run `npm install` again if the lockfile should pick up this change.");
