import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT, runInherit } from "./release-lib.mjs";

const clientPath = join(ROOT, "packages/client/package.json");
const reactPath = join(ROOT, "packages/react/package.json");
const client = JSON.parse(readFileSync(clientPath, "utf8"));
const react = JSON.parse(readFileSync(reactPath, "utf8"));
const dep = react.dependencies?.["@uthana/client"];

if (dep == null) {
  console.error('publish-packages: @uthana/react is missing dependencies["@uthana/client"]');
  process.exit(1);
}
if (String(dep).includes("file:")) {
  console.error(
    'publish-packages: @uthana/react depends on @uthana/client via "file:". Run `npm run set-version` or `npm install`, then try again.',
  );
  process.exit(1);
}

if (typeof client.version !== "string" || !client.version) {
  console.error("publish-packages: packages/client/package.json is missing a valid version");
  process.exit(1);
}

const extraArgs = process.argv.slice(2);

runInherit("npm", ["run", "build"]);
runInherit("npm", ["publish", "-w", "@uthana/client", "--access", "public", ...extraArgs]);
runInherit("npm", ["publish", "-w", "@uthana/react", "--access", "public", ...extraArgs]);
