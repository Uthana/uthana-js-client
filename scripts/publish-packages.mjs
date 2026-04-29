import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const clientPath = join(root, "packages/client/package.json");
const client = JSON.parse(readFileSync(clientPath, "utf8"));
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

if (typeof client.version !== "string" || !client.version) {
  console.error("publish-packages: packages/client/package.json is missing a valid version");
  process.exit(1);
}

const extraArgs = process.argv.slice(2);
const isDryRun = extraArgs.includes("--dry-run");
const skipTagCheck = process.env.SKIP_RELEASE_TAG_CHECK === "1";

/** Require a git tag v{version} on HEAD before a real publish (skipped for --dry-run). */
function assertReleaseGitTag(version) {
  if (skipTagCheck || isDryRun) return;
  const tag = `v${version}`;
  const tagOk = spawnSync("git", ["rev-parse", "-q", "--verify", `refs/tags/${tag}`], {
    cwd: root,
  });
  if (tagOk.status !== 0) {
    console.error(`publish-packages: missing git tag ${tag} for @uthana/client@${version}.`);
    console.error(
      `  Create it on the release commit, then push: git tag -a ${tag} -m "Release ${version}" && git push origin ${tag}`,
    );
    console.error(`  (Override: SKIP_RELEASE_TAG_CHECK=1 npm run publish)`);
    process.exit(1);
  }
  const atHead = spawnSync("git", ["describe", "--tags", "--exact-match", "HEAD"], {
    cwd: root,
    encoding: "utf8",
  });
  const headTag = atHead.stdout?.trim();
  if (atHead.status !== 0 || headTag !== tag) {
    console.error(
      `publish-packages: HEAD must match release tag ${tag} (current: ${headTag || "not exactly tagged"}).`,
    );
    console.error(
      `  Check out the tagged commit or tag this commit: git tag -a ${tag} -m "Release ${version}"`,
    );
    process.exit(1);
  }

  const onOrigin = spawnSync(
    "git",
    ["ls-remote", "--exit-code", "--tags", "origin", `refs/tags/${tag}`],
    { cwd: root },
  );
  if (onOrigin.status == null || (onOrigin.status !== 0 && onOrigin.status !== 2)) {
    console.error("publish-packages: could not verify remote tags on origin (network/auth?).");
    process.exit(1);
  }
  if (onOrigin.status !== 0) {
    console.error(`publish-packages: tag ${tag} is not on origin (GitHub).`);
    console.error(`  Push it: git push origin $(git branch --show-current) --follow-tags`);
    console.error(`  (Override: SKIP_RELEASE_TAG_CHECK=1 npm run publish)`);
    process.exit(1);
  }
}

assertReleaseGitTag(client.version);

function run(cmd, args) {
  const result = spawnSync(cmd, args, { cwd: root, stdio: "inherit", shell: false });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run("npm", ["run", "build"]);
run("npm", ["publish", "-w", "@uthana/client", "--access", "public", ...extraArgs]);
run("npm", ["publish", "-w", "@uthana/react", "--access", "public", ...extraArgs]);
