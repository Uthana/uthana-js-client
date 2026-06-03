/**
 * Shared helpers for release scripts (set-version, publish-packages).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const CLIENT_PKG = join(ROOT, "packages/client/package.json");
const REACT_PKG = join(ROOT, "packages/react/package.json");
const ROOT_PKG = join(ROOT, "package.json");

const SEMVER_RE = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-rc\.(0|[1-9]\d*))?$/;

/**
 * Parse a bare semver string like "1.2.3" or "1.2.3-rc.0".
 * A leading "v" is stripped automatically.
 * @param {string} version
 * @returns {{ full: string, base: string, isPrerelease: boolean }}
 */
export function parseVersion(version) {
  const v = version.trim().replace(/^v/, "");
  if (!SEMVER_RE.test(v)) {
    throw new Error(
      `Invalid version: "${version}". Expected MAJOR.MINOR.PATCH or MAJOR.MINOR.PATCH-rc.N`,
    );
  }
  const base = v.split("-")[0];
  return { full: v, base, isPrerelease: v.includes("-") };
}

/**
 * Write `version` to root, client, and react package.json files, run sync-versions
 * to update @uthana/react's @uthana/client dependency range, then update the lockfile.
 * @param {string} version - bare version string, e.g. "1.2.3"
 */
export function setPackageVersions(version) {
  for (const pkgPath of [ROOT_PKG, CLIENT_PKG, REACT_PKG]) {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
    pkg.version = version;
    writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, "utf8");
  }
  runInherit("node", [join(ROOT, "scripts/sync-versions.mjs")]);
  runInherit("npm", ["install", "--package-lock-only", "--ignore-scripts"]);
}

/**
 * Run a command with inherited stdio; exit on failure.
 * @param {string} cmd
 * @param {string[]} args
 */
export function runInherit(cmd, args) {
  const result = spawnSync(cmd, args, { cwd: ROOT, stdio: "inherit", shell: false });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
