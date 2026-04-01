import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const reactPath = join(root, "packages/react/package.json");
const react = JSON.parse(readFileSync(reactPath, "utf8"));
const dep = react.dependencies?.["@uthana/client"];

if (dep == null) {
  console.error('publish-packages: @uthana/react is missing dependencies["@uthana/client"]');
  process.exit(1);
}
if (String(dep).includes("file:")) {
  console.error(
    'publish-packages: @uthana/react depends on @uthana/client via "file:". Run `npm run sync-versions` or `npm install` (prepare runs sync-versions), or set a registry semver range.',
  );
  process.exit(1);
}

const extraArgs = process.argv.slice(2);

function run(cmd, args) {
  const result = spawnSync(cmd, args, { cwd: root, stdio: "inherit", shell: false });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run("npm", ["run", "build"]);
run("npm", ["publish", "-w", "@uthana/client", "--access", "public", ...extraArgs]);
run("npm", ["publish", "-w", "@uthana/react", "--access", "public", ...extraArgs]);
