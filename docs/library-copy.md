# Copy the best library motion

`ttm.librarySearch(prompt, options)` searches the shared motion library and your organization's labeled motions by meaning, selects one closest match, and copies it into your organization as a new motion. This is charged per second of the returned clip under `library-search-1.0`, even for a weak match. It is not free candidate browsing and returns one result, not a list.

```typescript
const copied = await client.ttm.librarySearch("a person walking slowly", {
  character_id: characterId,
});
console.log(copied.motion_id, copied.name, copied.match_score);
```

The character defaults to Tar when omitted. Missing names/scores remain null; known zero remains zero. A higher reported cosine-similarity score indicates a closer description match, but it does not establish visual quality. Review the result before calling it suitable. A poor match does not prove that the library lacks a better clip.

A missing result ID is an uncertain outcome: inspect existing work before resubmitting. No helper retries this charged operation. React's `useUthanaLibrarySearch()` is a mutation with retries explicitly disabled and refreshes motion lists after success. New candidate browsing remains unavailable until the platform provides that separate API.
