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

These change only your feedback. They never generate a motion. Repeating a favorite call keeps the same state. An absent vote is different from a dislike. Existing integer scores (1=like, 0=dislike) and `favorite(id, false)` remain supported. Other scores, including 2 and booleans, are rejected before transport.

Clearing requires server support for `clear_motion_rating`. An older server rejects the request; the client does not substitute a dislike or retry automatically. A missing clear confirmation raises `kind: "uncertain"`; inspect your current vote before another attempt.

## Advanced callers and React

Existing annotation ratings with `label_id` and like/dislike values remain supported. Clearing applies only to the whole motion: combining null with `label_id` is rejected before any request. No method accepts a user selector. Existing motion response fields remain compatible; ordinary feedback needs only the score and timestamps.

`useUthanaRateMotion()` accepts the same score values, including null, and refreshes motion detail and list queries after success. It does not retry automatically. For explicit favorite actions, use `useUthanaClient().motions.favorite(id)` or `.unfavorite(id)`.
