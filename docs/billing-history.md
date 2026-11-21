# Read billing history

`org.getLedger()` reads PAYG charges, top-ups, credits and adjustments, newest first. It does not purchase credit or change billing settings.

```typescript
const entries = await client.org.getLedger({
  limit: 50,
  since: "2026-11-19T00:00:00Z",
  types: ["debit"],
});
const last = entries.at(-1);
if (last?.id) {
  const older = await client.org.getLedger({
    limit: 50,
    since: "2026-11-19T00:00:00Z",
    types: ["debit"],
    beforeId: last.id,
  });
}
```

Use the last returned entry's ID as `beforeId` to read older entries, retaining other filters. There is no response cursor. Limit accepts 1–500 and defaults to 50. `since` is inclusive and `until` exclusive; pass a Date or ISO 8601 string. Explicit timestamps with a timezone avoid ambiguity. Every request, including pagination, is bounded to the last 7 days relative to the client clock. Omitted/null `since` defaults to 7 days ago and `until` to now. Explicit dates must fall within that window, with `since` earlier than `until`; otherwise the SDK rejects the call before sending it. Use the API directly or the web for older history. The examples assume today is November 20, 2026. An empty `types` array stays empty; no unknown field is silently invented.

USD amounts remain decimal strings. Read direction from `type`: a debit is a charge, topup/credit_grant add credit, and adjustment is signed. Preserve null balances and known zero amounts. On debit rows, historical `job_id` identifies the charged asset; `task_id` identifies the processing job to inspect with `jobs.get()`. Failed generations have no asset. A balance difference or estimate does not establish an operation's actual charge.

React exposes `useUthanaLedger(options)` with the entry array in `data`. A non-secret client scope, filters and page position are part of its cache key; errors are reported without automatic retries. Authorization failures propagate. No helper automatically reads every page.

Malformed ledger containers, IDs or financial fields raise an invalid-response error. The client preserves valid decimal strings and null/zero values, builds owned records, and never treats a malformed response as an empty billing history.
