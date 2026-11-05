# Stitching

`stitch` joins exactly two existing motions on one character. Each step is a flat object with a required `motion_id`. The service samples, retargets, and aligns the sources; no local pose sampler is required.

## Simple join

```json
{"character_id": "CHARACTER_ID", "steps": [{"motion_id": "FIRST_MOTION_ID"}, {"motion_id": "SECOND_MOTION_ID"}]}
```

## Trims and placement

Transition fields belong to the outgoing first motion. This example trims both sources and places the second motion one meter forward, half a meter right, and facing 45 degrees right relative to the first motion’s ending facing.

```json
{
  "character_id": "CHARACTER_ID",
  "steps": [
    {
      "motion_id": "FIRST_MOTION_ID",
      "trim_start_frame": 12,
      "trim_end_frame": 60,
      "transition_duration_seconds": 1.5,
      "transition_forward_meters": 1.0,
      "transition_right_meters": 0.5,
      "transition_facing_degrees": 45.0
    },
    {
      "motion_id": "SECOND_MOTION_ID",
      "trim_start_seconds": 0.5,
      "trim_end_seconds": 3.0
    }
  ]
}
```

Use `trim_start_frame`/`trim_end_frame` or `trim_start_seconds`/`trim_end_seconds` per step, never both units on one step. Frames are zero-based native source samples, with inclusive endpoints. Seconds snap inward to native samples. Start defaults to zero; omitting end reserves the required model context. Invalid or unusable explicit intervals are rejected. Select more than 0.15 seconds and leave the first motion’s required endpoint context.

Omitting `transition_duration_seconds` defaults to one second. Durations must be 0.1–3 seconds and are rounded to 20 Hz model frames. Omit all three placement fields for automatic continuation of recent travel and aligned facing. Supplying any placement field requests explicit placement; omitted components become zero. Forward/right distances are in meters, limited to -100 through 100; facing is in degrees, limited to -180 through 180, with positive values turning right. Placement is relative, not absolute.

Omit unspecified fields rather than supplying null. Transition fields on the final motion receive scalar/type checks but are otherwise ignored: they do not affect execution, billing, or request identity. SDK and MCP inputs reject numeric strings, booleans, and nonfinite values. Direct GraphQL calls use ordinary String, Int, and Float coercion before semantic validation; frame inputs use the GraphQL signed 32-bit integer range.

## Result and recovery

The result contains `motion` and two flat `resolved_steps`. Both steps report `motion_id`, `trim_start_frame`, `trim_end_frame`, `trim_start_seconds`, and `trim_end_seconds`. The first also reports the rounded `transition_duration_seconds`. Explicit placement returns all three normalized placement fields on the first step; automatic continuation omits them. Raw poses and model parameters remain internal.

Stitching is synchronous and billed at $0.01 per second of output motion. Allow at least 420 seconds in an MCP host, inspect resolved trims, and review playback before accepting the animation. Never automatically retry an uncertain paid operation. MCP calls additionally require a durable `request_id`; use `get_request_status` to recover results before resubmitting. Historical receipts remain readable.

Existing sampled-pose stitching methods and looping remain available separately.
