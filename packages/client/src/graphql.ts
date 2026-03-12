/**
 * (c) Copyright 2026 Uthana, Inc. All Rights Reserved
 *
 * GraphQL query and mutation strings for the Uthana API.
 */

export const CREATE_T2M = `
mutation CreateT2m(
  $prompt: String!,
  $character_id: String,
  $model: String!,
  $foot_ik: Boolean,
  $enhance_prompt: Boolean,
  $steps: Int,
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
    enhance_prompt: $enhance_prompt,
    steps: $steps,
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
    created_at
    started_at
    ended_at
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
    created_at
    started_at
    ended_at
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

export const GET_MOTION_BY_ID = `
query GetMotionById($motionId: String!) {
  motion(id: $motionId) {
    id
    name
    org_id
    created
    updated
    favorite {
      user_id
      label_id
      created
      updated
    }
    rating {
      user_id
      label_id
      score
      created
    }
    tags
  }
}
`;

export const RATE_MOTION = `
mutation RateMotion($motion_id: String!, $label_id: String, $score: Int!) {
  rate_motion(motion_id: $motion_id, label_id: $label_id, score: $score) {
    motion_rating {
      motion_id
      label_id
      score
    }
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

export const CREATE_IMAGE_FROM_TEXT = `
mutation CreateImageFromText($prompt: String!) {
  create_image_from_text(prompt: $prompt) {
    character_id
    images {
      key
      url
    }
  }
}
`;

export const CREATE_IMAGE_FROM_IMAGE = `
mutation CreateImageFromImage($file: Upload!) {
  create_image_from_image(file: $file) {
    character_id
    image {
      key
      url
    }
  }
}
`;

export const CREATE_CHARACTER_FROM_IMAGE = `
mutation CreateCharacterFromImage($character_id: String!, $image_key: String!, $prompt: String!, $name: String) {
  create_character_from_image(character_id: $character_id, image_key: $image_key, prompt: $prompt, name: $name) {
    character {
      id
      name
    }
    auto_rig_confidence
  }
}
`;

export const RENAME_CHARACTER = `
mutation RenameCharacter($character_id: String!, $name: String!) {
  update_character(character_id: $character_id, name: $name) {
    character {
      id
      name
    }
  }
}
`;

export const DELETE_CHARACTER = `
mutation DeleteCharacter($character_id: String!) {
  update_character(character_id: $character_id, deleted: true) {
    character {
      id
      name
    }
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

export const GET_MOTION_DOWNLOADS = `
query GetMotionDownloads {
  motion_downloads {
    motion_id
    character_id
    secs
    created
    motion {
      id
      name
      org_id
      created
      updated
    }
  }
}
`;

export const MOTION_DOWNLOAD_ALLOWED = `
query motion_download_allowed($characterId: String, $motionId: String) {
  motion_download_allowed(character_id: $characterId, motion_id: $motionId) {
    allowed
  }
}
`;
