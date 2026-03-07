/**
 * (c) Copyright 2026 Uthana, Inc. All Rights Reserved
 *
 * GraphQL query and mutation strings for the Uthana API.
 */

export const TEXT_TO_MOTION_VQVAE_V1 = `
mutation TextToMotion(
  $prompt: String!,
  $character_id: String,
  $model: String!,
  $foot_ik: Boolean
) {
  create_text_to_motion(
    prompt: $prompt,
    character_id: $character_id,
    model: $model,
    foot_ik: $foot_ik
  ) {
    motion {
      id
      name
    }
  }
}
`;

export const TEXT_TO_MOTION_DIFFUSION_V2 = `
mutation CreateTextToMotion(
  $prompt: String!,
  $character_id: String,
  $model: String!,
  $foot_ik: Boolean,
  $cfg_scale: Float,
  $length: Float,
  $seed: Int,
  $retargeting_ik: Boolean
) {
  create_text_to_motion(
    prompt: $prompt,
    character_id: $character_id,
    model: $model,
    foot_ik: $foot_ik,
    cfg_scale: $cfg_scale,
    length: $length,
    seed: $seed,
    retargeting_ik: $retargeting_ik
  ) {
    motion {
      id
      name
    }
  }
}
`;

export const CREATE_CHARACTER = `
mutation CreateCharacter(
  $name: String!,
  $file: Upload!,
  $auto_rig: Boolean,
  $auto_rig_front_facing: Boolean
) {
  create_character(
    name: $name,
    file: $file,
    auto_rig: $auto_rig,
    auto_rig_front_facing: $auto_rig_front_facing
  ) {
    character {
      id
      name
    }
    auto_rig_confidence
  }
}
`;

export const CREATE_VIDEO_TO_MOTION = `
mutation CreateVideoToMotion($file: Upload!, $motion_name: String!, $model: String) {
  create_video_to_motion(file: $file, motion_name: $motion_name, model: $model) {
    job {
      id
      status
    }
  }
}
`;

export const GET_JOB = `
query GetJob($job_id: String!) {
  job(job_id: $job_id) {
    id
    status
    result
  }
}
`;

export const LIST_JOBS = `
query ListJobs($method: String) {
  jobs(method: $method) {
    id
    status
    method
    created
    updated
  }
}
`;

export const LIST_MOTIONS = `
query {
  motions {
    id
    name
    created
  }
}
`;

export const LIST_CHARACTERS = `
query {
  characters {
    id
    name
    created
    updated
  }
}
`;

export const GET_USER = `
query {
  user {
    id
    name
    email
    email_verified
  }
}
`;

export const GET_ORG = `
query {
  org {
    id
    name
    motion_download_secs_per_month
    motion_download_secs_per_month_remaining
  }
}
`;

export const CREATE_MOTION_FROM_GLTF = `
mutation create_motion_from_gltf($gltf: String!, $motionName: String!, $characterId: String) {
  create_motion_from_gltf(gltf: $gltf, motion_name: $motionName, character_id: $characterId) {
    motion { id }
  }
}
`;

export const UPDATE_MOTION = `
mutation update_motion($id: String!, $name: String, $deleted: Boolean) {
  update_motion(id: $id, name: $name, deleted: $deleted) {
    id
    name
    deleted
  }
}
`;

export const CREATE_MOTION_FAVORITE = `
mutation create_motion_favorite($motion_id: String!) {
  create_motion_favorite(motion_id: $motion_id) {
    id
    motion_id
  }
}
`;

export const DELETE_MOTION_FAVORITE = `
mutation delete_motion_favorite($motion_id: String!) {
  delete_motion_favorite(motion_id: $motion_id) {
    id
  }
}
`;
