# Node client contributor guide

Apply these conventions to new or changed code in the client and React packages. Preserve public interfaces and avoid unrelated formatting or typing migrations.

## TypeScript and validation

- Follow the checked-in TypeScript and ESLint/Prettier configuration. Use type-only module imports, explicit public return types, and discriminated unions for variants.
- Use `unknown` for untrusted input and narrow it with guards. Construct typed normalized records and tuples after validation instead of casting a mapped array into the desired contract.
- Keep braces around new conditional branches, including single-statement branches. Use descriptive variables rather than shorthand names for domain values.
- Use an options object when new helper arguments are numerous or easy to swap. Preserve existing public positional signatures.
- The client supports browser consumers and Node 18+. Keep Node-only imports in scripts/tests, not shared runtime modules; do not introduce new runtime dependencies solely for stylistic consistency with Python.
- Start boolean variable names with `is` or `has`, using the language’s casing: `is_valid_motion`, `has_frame_range` in Python; `isValidMotion`, `hasFrameRange` in TypeScript. Prefer names that read as a clear predicate. Preserve published parameter and field names for compatibility.
- Name predicates for the domain rule they express, then combine names at a shared error, return, or continuation. Keep simple type-narrowing guards inline before field access. Do not compute an unsafe or expensive predicate eagerly just to give it a name.
- Treat untrusted values as `object` in Python or `unknown` in TypeScript until validated. Build owned normalized records with declared types; a cast is not runtime validation. Keep any necessary assertion local to the checks that justify it.
- Distinguish omitted fields from explicit null, zero, and false. Apply defaults only where the contract permits them. Validation must not mutate caller-owned nested data.
- Name domain limits and non-obvious numeric tolerances, including units. Keep equivalent cross-language contracts aligned with shared acceptance, rejection, and normalization fixtures.
- Keep runtime validation in normal control flow; do not use Python `assert` for caller input, permissions, or side-effect preconditions. Assertions may narrow already-proven internal invariants, but prefer a type design that avoids repeating the proof.
- Use module-level imports, including TypeScript `import type`. Local imports need a circular-dependency or measurable startup-cost reason. Keep module summaries accurate when a file serves both current and legacy interfaces.
- Let unexpected errors propagate. Catch an exception only when that failure is expected and recovery or another code path is required. Preserve useful error categories at external boundaries.
- Write error messages that say what failed and what to do next. Identify the record, field, or operation and include safe lookup values when useful, for example, "No character_id found matching {character_id}." For validation errors, state the expected shape, range, or step order. Use distinct errors for distinct failures rather than a generic "incomplete result" or "No resource found." Never include credentials or private provider details, and do not suggest resubmitting a paid operation when its outcome is unknown.
- Preserve published signatures, error categories, unknown-outcome recovery, and side-effect order during style changes. Do not retrofit unrelated existing code. Add tests for changed behavior or meaningful gaps, not for a cosmetic rewrite of the same implementation.

## Verification and review

Use the checked-in workspace commands:

```sh
npm ci
npm run lint
npx tsc --noEmit -p packages/client/tsconfig.json
npm run test:unit
npm run build
npm run release:publish-dry-run
```

Use ESLint's formatter integration as the authoritative check; if a standalone formatter disagrees, fix the file through the configured ESLint command. Do not suppress the rule. Run appropriate React tests/builds for React changes; a client type check alone does not cover the React package.

Keep normal tests offline with mocked transport and include error/recovery behavior where relevant. Do not add tests that merely mirror a cosmetic rewrite or invent a coverage threshold. Validate documentation examples and local links for documentation-only changes.

Review the complete PR diff for style, bugs, security, abstraction cost, and compatibility. Report actual checks and tooling limits. Keep long guides under `docs/`, make them self-contained, and show simple then advanced examples. Keep client/react versions synchronized through the existing release scripts. Never merge or publish without authorization.

## Public project metadata

Keep internal ticket identifiers, tracker links, and private planning references out of public content and metadata, including documentation, comments, examples, commit messages, branch/tag names, PRs, issues, and releases. Describe the public-facing behavior instead; track internal coordination in private systems with links to the public work.
