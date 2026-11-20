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

Use "like" or "dislike" to rate a motion, or null to clear your vote. Repeating a favorite call keeps the same state. Clearing a vote is different from disliking the motion.

A missing confirmation when clearing a vote raises `kind: "uncertain"`. Check your current vote before trying again; the client does not retry automatically.

## Advanced callers and React

Existing annotation ratings with `label_id` and like/dislike values remain supported. Clearing applies only to the whole motion: combining null with `label_id` is rejected before any request. No method accepts a user selector. Existing motion response fields remain compatible; ordinary feedback needs only the score and timestamps.

`useUthanaRateMotion()` accepts the same score values, including null, and refreshes motion detail and list queries after success. It does not retry automatically. For explicit favorite actions, use `useUthanaClient().motions.favorite(id)` or `.unfavorite(id)`.
