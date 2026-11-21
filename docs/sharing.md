# Share a motion publicly

```typescript
const link = await client.motions.share(characterId, motionId);
console.log(link.preview_url);
```

Only call this when the user wants a public link. Anyone with the URL can open the viewer without an account. The link stays public until the asset is deleted; the client has no unpublish operation. `png_url` is a small social preview image, not the interactive viewer.

Optional `start` and `end` select a playback window as fractions of the source duration, with `0 <= start < end <= 1`. They do not modify the motion, and their precision is preserved in the viewer URL. The default is the full clip.

```typescript
const excerpt = await client.motions.share(characterId, motionId, { start: 0.125, end: 0.875 });
```

React provides `useUthanaShareMotion()`, an explicit mutation with automatic retries disabled. A missing image URL or lost mutation response may mean publication succeeded: inspect the motion in the app rather than assuming it is still private.
