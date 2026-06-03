#!/usr/bin/env node
/**
 * Bump the monorepo version in all package.json files without creating a git commit or tag.
 *
 * Usage:
 *   node scripts/set-version.mjs 1.2.3
 *   npm run set-version -- 1.2.3
 */
import { parseVersion, setPackageVersions } from "./release-lib.mjs";

const version = process.argv[2];
if (!version) {
  console.error("Usage: npm run set-version -- SEMVER  (e.g. 1.2.3 or 1.2.3-rc.0)");
  process.exit(1);
}

try {
  const parsed = parseVersion(version);
  setPackageVersions(parsed.full);
  console.log(`set-version: bumped monorepo to ${parsed.full}`);
} catch (err) {
  console.error(`ERROR: ${err.message}`);
  process.exit(1);
}
