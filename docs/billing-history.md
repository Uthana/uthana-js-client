# Read billing history

`org.getLedger()` reads PAYG charges, top-ups, credits and adjustments, newest first. It does not purchase credit or change billing settings.

```typescript
const entries = await client.org.getLedger({
  limit: 50,
  since: "2026-11-01T00:00:00Z",
  types: ["debit"],
});
const last = entries.at(-1);
if (last?.id) {
  const older = await client.org.getLedger({
    limit: 50,
    since: "2026-11-01T00:00:00Z",
    types: ["debit"],
    beforeId: last.id,
  });
}
```

Use the last returned entry's ID as `beforeId` to read older entries, retaining other filters. There is no response cursor. Limit accepts 1–500 and defaults to 50. `since` is inclusive and `until` exclusive; pass a Date or ISO 8601 string. Explicit timestamps with a timezone avoid ambiguity. Omitted/null filters are not declared or sent, preserving older limit-only API compatibility. An empty `types` array stays empty; no unknown field is silently invented.

USD amounts remain decimal strings. Read direction from `type`: a debit is a charge, topup/credit_grant add credit, and adjustment is signed. Preserve null balances and known zero amounts. On debit rows, historical `job_id` identifies the charged asset; `task_id` identifies the processing job to inspect with `jobs.get()`. Failed generations have no asset. A balance difference or estimate does not establish an operation's actual charge.

React exposes `useUthanaLedger(options)` with the entry array in `data`. Filters and page position are part of its cache key; errors are reported without automatic retries. Authorization failures propagate. No helper automatically reads every page.
