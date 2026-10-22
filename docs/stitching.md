# Stitching

`stitch` joins two existing motions on a selected character. Supply exactly three typed steps: `motion`, `transition`, `motion`. Uthana samples, retargets, and aligns the sources on the server and creates a separate motion. No local pose sampler is required.

## Simple join

Join two motions with automatic positioning. The server handles sampling and alignment.

```json
{
  "character_id": "CHARACTER_ID",
  "steps": [
    {
      "type": "motion",
      "motion_id": "FIRST_MOTION_ID"
    },
    {
      "type": "transition",
      "duration_seconds": 1.0
    },
    {
      "type": "motion",
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
      "type": "motion",
      "motion_id": "FIRST_MOTION_ID",
      "range": {
        "start_frame": 12,
        "end_frame": 60
      }
    },
    {
      "type": "transition",
      "duration_seconds": 1.5
    },
    {
      "type": "motion",
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

The transition defaults to one second. Allowed durations are 0.1–3 seconds, quantized to the model's 20 Hz frames. The selected interval must exceed 0.15 seconds; the first motion also needs endpoint context. Check `resolved_steps` for the effective ranges in both native frames and seconds and the effective transition duration.

## Placement

Placement belongs to the arriving motion (the final step). Omit it for automatic continuation of recent travel and alignment of facing. Supplying an object requests explicit relative placement: unspecified fields become zero, so `{}` means no spatial gap and no turn.

`forward_m` and `right_m` are meters from the preceding motion's ending pelvis, relative to its ending facing. `turn_degrees` is relative facing in degrees, positive to the right. Distances are limited to ±100 meters and turning to ±180 degrees. Height is preserved. The same rigid transform applies to the arriving clip's samples.

`absolute` may be omitted or set to `false`; `true` is not supported yet. Placement on the first motion is unsupported. XYZ offsets, quaternion rotation, longer sequences, pose steps, and keyframe steps are reserved for future support and are rejected now.

## Result and recovery

All interfaces return the same core fields: `motion` and `resolved_steps`. Resolved motion steps include `motion_id` and effective `range`; the arriving step reports normalized explicit placement or `{"mode": "automatic"}`. Raw pose samples and model parameters are internal.

The operation is synchronous and may spend account credits based on generated output seconds. Allow at least 420 seconds in the host. Choose a duration appropriate to the gap and review playback; a saved result is not proof of visual quality. Never automatically retry an uncertain mutation. MCP additionally requires a durable `request_id` and returns receipt/recovery metadata; use `get_request_status` before retrying.

The backend must expose `stitch(input: StitchInput!)` before client 0.6.0 or the MCP using it is released. Existing sampled-pose SDK methods and backend mutations remain supported for compatibility, but are not required for this workflow.
