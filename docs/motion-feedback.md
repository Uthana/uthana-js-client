# Like, dislike and favorite motions

```typescript
import { UthanaClient } from "@uthana/client";

const client = new UthanaClient("YOUR_API_KEY");
await client.motions.rate("motion-id", "like");
await client.motions.rate("motion-id", "dislike");
await client.motions.rate("motion-id", null); // clear your whole-motion vote
await client.motions.favorite("motion-id");
await client.motions.unfavorite("motion-id");
```

Use "like" or "dislike" to rate a motion, or `null` to clear your vote.

A missing confirmation when clearing a vote raises `kind: "uncertain"`. Check your current vote before trying again; the client does not retry automatically.

## React

`useUthanaRateMotion()` accepts the same score values, including null, and refreshes motion detail and list queries after success. It does not retry automatically. For explicit favorite actions, use `useUthanaClient().motions.favorite(id)` or `.unfavorite(id)`.
