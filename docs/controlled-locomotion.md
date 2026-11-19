# Path-controlled locomotion preview

This optional backend capability generates a saved CAMDM animation from a character, style, path and pace changes. It requires an enabled backend and provisioned workers. The offline options catalog describes this client's contract; it does not prove deployment availability or account access.

Waypoints use fixed initial right/forward axes. Start at `(0, 0)` and put the second point directly forward. Coordinates use metres or character-height units, bounded to ±10. Supply 2–16 points at least 0.05 units apart. The worker validates the smoothed path against its 12-metre physical limit after height conversion. A character height means skeleton bone extent, excluding mesh and accessories.

Supply 1–16 pace changes, starting at path fraction zero and strictly increasing below one. Speeds are 0.25–1.2 m/s. Fractions mean progress along the smoothed path, not elapsed time. Set `allow_slowing` to true: turns and stopping require slowing, and every clip ends with a stop. Requested speed is not an exact measured pace or duration guarantee. The maximum clip length is 20 seconds. The options catalog lists the four supported characters and five supported styles. Character access remains enforced by the backend.

Submit once and retain the returned job ID. Poll through the existing jobs API. A FINISHED job is not necessarily successful: inspect `job.result.exc` and `job.result.result.status`. Only `succeeded` with a saved `motion_id` permits preview/download through existing motion methods. `constraints_not_met` has no saved motion or motion debit; inspect measurements, explain the failure, and simplify the plan before an explicitly chosen retry. Errors and timeouts use the normal job error envelope. If submission times out or returns no job ID, its outcome is unknown: inspect existing jobs before retrying. The client never automatically resubmits.

Saved successful motions use normal locomotion billing; normal preview and download eligibility rules apply. Root-path and stopping checks do not certify foot contact or visual quality. Review the animation before using it.

```typescript
import { controlledLocomotionOptions } from "@uthana/client";

console.log(controlledLocomotionOptions()); // Offline contract
console.log(await client.motions.getControlledLocomotionOptions()); // Live availability
const job = await client.motions.createControlledLocomotion("cH32hVsowEyB", {
  plan: {
    points: [{right: 0, forward: 0}, {right: 0, forward: 2}],
    pace_changes: [{path_fraction: 0, speed_mps: 0.8}],
    allow_slowing: true,
  },
});
console.log(job.id); // Retain for jobs.get / jobs.wait and recovery.
```
