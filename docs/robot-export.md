# Export Unitree G1 motion

```typescript
const csv = await client.motions.downloadRobot(characterId, motionId, { fps: 30 });
```

The result is an ArrayBuffer containing CSV joint trajectories for Unitree G1. The character selects access and download billing; it does not change the target robot. FPS accepts 24, 30, or 60, with a backend default of 30 when omitted. The default request timeout is 660 seconds because retargeting runs on a GPU. Optional `maxBytes` limits the accepted response size and `timeoutSeconds` changes the request timeout. Existing mesh download options do not apply.

In React, call `useUthanaClient().motions.downloadRobot(...)` from your explicit download action.
