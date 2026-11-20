# Find characters and motions

Use `characters.listPaged()` and `motions.listPaged()` to search saved names, choose an order, and read one page at a time. They require the API's `characters_paged` and `motions_paged` fields. Existing `list()` methods keep their behavior and return arrays.

```typescript
const page = await client.characters.listPaged({
  source: "mine",
  order: "created_desc",
  limit: 20,
});
for (const character of page.items) {
  console.log(character.id, character.name, character.created);
}
```

`mine` means your organization's assets, including teammates' assets. `uthana` selects shared Uthana examples; `all` includes both and is the default. Creation time describes the asset record, not a separate upload date. Missing dates remain null and visibility does not imply edit permission.

## Search and continue

```typescript
const options = {
  query: "walk slow",
  source: "mine",
  order: "name_asc",
  method: "TextToMotion",
  limit: 50,
} as const;
let page = await client.motions.listPaged(options);
for (;;) {
  for (const motion of page.items) console.log(motion.id, motion.name);
  if (page.next_cursor === null) break;
  page = await client.motions.listPaged({ ...options, cursor: page.next_cursor });
}
```

Search matches every word in the name, ignoring case. Each word needs at least three consecutive letters or digits; the whole query is at most 200 characters. The optional motion `method` matches the saved Method tag exactly, ignoring case, and is at most 100 characters. It does not reliably identify the model version. This searches saved assets, not library candidates.

Choose `created_desc` (default), `created_asc`, `name_asc`, or `name_desc`. IDs break ties; missing sort values come last. Page size is 1–100, default 20. Omitted or null options use server defaults. Invalid options raise errors instead of silently changing the request. Page limits are validated before JSON serialization, including non-finite numbers. Motion tags may be a dictionary, a string array, or null.

Pass `next_cursor` unchanged with the same account, query, source, method, and order. You may change page size. Null ends the results. If a cursor becomes invalid, restart without it. Pages are not snapshots: assets can change between calls. These queries find older matching motions beyond the recent 1,000; refined video motions replace their base version in this listing. No helper automatically reads every page or retries a failed request.

## React

`useUthanaCharactersPaged(options)` and `useUthanaMotionsPaged(options)` return TanStack Query results with the page in `data`. Query keys include a non-secret client scope and all options, including the cursor, so different filters/pages cannot share cached results. Existing asset mutation hooks invalidate these queries through their common asset key prefix.

```tsx
const result = useUthanaCharactersPaged({ source: "mine", order: "created_desc" });
// Render result.data?.items, and pass result.data?.next_cursor for the next page.
```
