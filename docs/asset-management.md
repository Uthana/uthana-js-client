# Inspect and restore assets

`characters.get(id)` returns character details, including its organization and creation/update dates. Missing or inaccessible characters raise a 404 error; missing dates remain null. Names can be duplicated, so select an asset by ID.

```typescript
const character = await client.characters.get(characterId);
const renamed = await client.motions.rename(motionId, "Walk slowly");
const removed = await client.characters.delete(characterId);
const restored = await client.characters.restore(characterId);
await client.motions.restore(motionId);
```

Rename, delete and restore return the updated character or motion record, including ownership and timestamps. Only the fields being changed are sent, so renaming does not accidentally restore an asset and restoring does not clear its name.

Deletion is soft and restore reverses it. Deleting a character keeps motions; deleting a motion keeps derivatives made from it. Keep deleted asset IDs because the normal lists no longer include them. No helper retries a failed mutation automatically.

React exposes `useUthanaCharacter(id)`, `useUthanaRestoreCharacter()` and `useUthanaRestoreMotion()`. The detail query is disabled for a null ID. Restore hooks refresh list/page and affected detail queries.
