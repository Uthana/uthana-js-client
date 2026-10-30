# Stitching

`stitch` joins two existing motions on a selected character. Supply exactly two motion objects, identified by `motion_id`. Nest the optional outgoing `transition` on the first motion. Uthana samples, retargets, and aligns the sources on the server and creates a separate motion. No local pose sampler is required.

## Simple join

Join two motions with automatic positioning. The server handles sampling and alignment.

```json
{
  "character_id": "CHARACTER_ID",
  "steps": [
    {
      "motion_id": "FIRST_MOTION_ID"
    },
    {
      "motion_id": "SECOND_MOTION_ID"
    }
  ]
}
```

## Join with ranges and positioning

Select source intervals and place the second motion one meter forward and half a meter right of the first motion’s ending pelvis, turned 45 degrees right. Placement is relative to the first motion’s ending facing.

```json
{
  "character_id": "CHARACTER_ID",
  "steps": [
    {
      "motion_id": "FIRST_MOTION_ID",
      "range": {
        "start_frame": 12,
        "end_frame": 60
      },
      "transition": {
        "duration_seconds": 1.5
      }
    },
    {
      "motion_id": "SECOND_MOTION_ID",
      "range": {
        "start_seconds": 0.5,
        "end_seconds": 3.0
      },
      "placement": {
        "forward_m": 1.0,
        "right_m": 0.5,
        "turn_degrees": 45.0
      }
    }
  ]
}
```

Choose ranges that fit your source motions and leave the required transition context. Frame indices use each source’s native FPS; do not mix frames and seconds within one range. Inspect `resolved_steps` and review playback before accepting the result.

## Source ranges

A motion's optional `range` uses either `start_frame`/`end_frame` or `start_seconds`/`end_seconds`. Do not mix units within one range. Frames are zero-based native source samples, not export frames, and both endpoints are inclusive. Seconds snap inward to native samples using the source FPS. Start defaults to zero; omit end to let the service reserve required model context. Explicit ranges outside available samples or too short for the model are rejected rather than silently shortened.

Omitting `transition`, supplying `{}`, or omitting `duration_seconds` defaults to one second. A transition on the final motion is ignored after transport shape checks; it does not affect execution, billing, or request identity. `transition: null` on the first motion is invalid. Allowed durations are 0.1–3 seconds, quantized to the model's 20 Hz frames. The selected interval must exceed 0.15 seconds; the first motion also needs endpoint context. Check `resolved_steps` for the effective ranges in both native frames and seconds and the effective transition duration.

## Placement

Placement belongs to the arriving motion (the final step). Omit it for automatic continuation of recent travel and alignment of facing. Supplying an object requests explicit relative placement: unspecified fields become zero, so `{}` means no spatial gap and no turn.

`forward_m` and `right_m` are meters from the preceding motion's ending pelvis, relative to its ending facing. `turn_degrees` is relative facing in degrees, positive to the right. Distances are limited to ±100 meters and turning to ±180 degrees. Height is preserved. The same rigid transform applies to the arriving clip's samples.

`absolute` may be omitted or set to `false`; `true` is not supported yet. Placement on the first motion is unsupported. XYZ offsets, quaternion rotation, longer sequences, pose steps, and keyframe steps are reserved for future support and are rejected now.

## Result and recovery

All interfaces return the same core fields: `motion` and `resolved_steps`. `resolved_steps` contains exactly two motion objects without a `type` field. The first includes the actual rounded `transition.duration_seconds`. Both include `motion_id` and effective `range`; the arriving step reports normalized explicit placement or `{"mode": "automatic"}`. Raw pose samples and model parameters are internal.

The operation is synchronous and may spend account credits based on generated output seconds. Allow at least 420 seconds in the host. Choose a duration appropriate to the gap and review playback; a saved result is not proof of visual quality. Never automatically retry an uncertain mutation. MCP additionally requires a durable `request_id` and returns receipt/recovery metadata; use `get_request_status` before retrying.

This contract requires Python and JS clients 0.8.0, MCP 0.3.0, and a backend exposing the two-motion `stitch(input: StitchInput!)` contract. Release the clients first, then MCP, then deploy the backend and pinned hosted runtime together. Validate the combined stack on staging before production activation. Existing sampled-pose SDK methods and backend mutations remain supported for compatibility, but are not required for this workflow.
