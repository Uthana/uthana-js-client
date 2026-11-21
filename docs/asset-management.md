# Inspect and restore assets

`characters.get(id)` returns character details, including its organization and creation/update dates. Missing or inaccessible characters raise a 404 error; missing dates remain null. Names can be duplicated, so select an asset by ID.

```typescript
const character = await client.characters.get(characterId);
const renamed = await client.motions.modify({ motion_id: motionId, name: "Walk slowly" });
const removed = await client.characters.modify({ character_id: characterId, deleted: true });
const restored = await client.characters.modify({ character_id: characterId, deleted: false });
await client.motions.modify({ motion_id: motionId, deleted: false });
```

Rename, delete and restore return the updated character or motion record, including ownership and timestamps. Only the fields being changed are sent, so renaming does not accidentally restore an asset and restoring does not clear its name.

Deletion is soft and restore reverses it. Deleting a character keeps motions; deleting a motion keeps derivatives made from it. Keep deleted asset IDs because the normal lists no longer include them. No helper retries a failed mutation automatically.

React exposes `useUthanaCharacter(id)`, `useUthanaRestoreCharacter()` and `useUthanaRestoreMotion()`. The detail query is disabled for a null ID. Restore hooks refresh list/page and affected detail queries.

Use `characters.modify(params)` or `motions.modify(params)` to change a name, delete or restore. You can change the name and deleted state in one call. Omitted fields stay unchanged; `deleted: false` restores the asset.

React provides `useUthanaModifyCharacter()` and `useUthanaModifyMotion()`. Call `.mutate(params)` from an event handler with the same object used by the client method. The hooks refresh lists, pages and detail queries after success and do not retry automatically.
