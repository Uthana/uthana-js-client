# Inspect and restore assets

`characters.get(id)` reads one accessible live character, including its owning organization and available record creation/update dates. Missing or inaccessible characters raise a 404 error; missing dates remain null. Names can be duplicated, so select an asset by ID.

```typescript
const character = await client.characters.get(characterId);
const renamed = await client.motions.rename(motionId, "Walk slowly");
const removed = await client.characters.delete(characterId);
const restored = await client.characters.restore(characterId);
await client.motions.restore(motionId);
```

Rename, delete and restore return the updated character or motion record, including ownership and timestamps. They use the account's existing write permissions; being able to read an asset does not establish edit permission. Only the fields being changed are sent, so renaming does not accidentally restore an asset and restoring does not clear its name.

Deletion is soft and restore reverses it. Deleting a character keeps motions; deleting a motion keeps derivatives made from it. Keep deleted asset IDs because the normal lists no longer include them. Built-in/example assets remain subject to backend write restrictions. No helper retries a failed mutation automatically.

React exposes `useUthanaCharacter(id)`, `useUthanaRestoreCharacter()` and `useUthanaRestoreMotion()`. The detail query is disabled for a null ID. Restore hooks refresh list/page and affected detail queries. Existing rename/delete method signatures and existing hooks remain supported.
