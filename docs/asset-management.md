# Inspect and modify assets

Use `characters.get(id)` or `motions.get(id)` to inspect an asset. Character details include its organization and creation/update dates; missing dates remain null. Missing or inaccessible assets raise a 404 error. Names can be duplicated, so select an asset by ID.

```typescript
const character = await client.characters.get(characterId);
const motion = await client.motions.get(motionId);
```

Use `rename(id, name)` to rename an asset and `delete(id)` to soft-delete it. Both methods return the updated record.

```typescript
await client.characters.rename(characterId, "Hero");
await client.motions.rename(motionId, "Walk slowly");

await client.characters.delete(characterId);
await client.motions.delete(motionId);
```

Use `modify(params)` to restore an asset or change multiple fields in one call. Provide at least one change; omitted fields stay unchanged.

```typescript
await client.characters.modify({ character_id: characterId, deleted: false });
await client.motions.modify({ motion_id: motionId, deleted: false });
```

You can rename and restore in one call:

```typescript
await client.characters.modify({
  character_id: characterId,
  name: "Restored hero",
  deleted: false,
});
```

Deletion is soft: `deleted: false` restores the asset. Deleting a character keeps its motions; deleting a motion keeps derivatives made from it. Keep deleted asset IDs because the normal lists no longer include them.

## React

Use `useUthanaCharacter(id)` or `useUthanaMotion(id)` to inspect an asset. Pass null to disable the query.

Modification hooks accept the same objects as the client methods through `.mutate(params)`. Call them from event handlers:

```tsx
import { useUthanaModifyCharacter } from "@uthana/react";

function RestoreCharacter({ characterId }: { characterId: string }) {
  const modify = useUthanaModifyCharacter();

  return (
    <button
      disabled={modify.isPending}
      onClick={() => modify.mutate({ character_id: characterId, deleted: false })}
    >
      Restore character
    </button>
  );
}
```

Use `useUthanaModifyMotion()` with `motion_id` to modify a motion. Both hooks refresh lists, pages and the affected detail queries after success. They do not retry automatically. If a change returns an uncertain outcome, inspect the asset before trying again.
