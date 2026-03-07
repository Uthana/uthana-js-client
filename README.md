# Uthana JS/TS Client

A JavaScript/TypeScript client for Uthana: generate lifelike human motion from text or 2D video, create and auto-rig characters, and manage your motions. Works in browser and Node.js.

## Packages

- **@uthana/client** — Core client (vanilla JS/TS, browser + Node.js)
- **@uthana/react** — React and react-query hooks

## Installation

```bash
npm install @uthana/client
# or for React
npm install @uthana/react @uthana/client @tanstack/react-query
```

## API key

You need an Uthana account and API key. [Sign up for free](https://uthana.com), then get your API key from [account settings](https://uthana.com/app/settings) once logged in.

## Quick start

### Core client

```ts
import { UthanaClient } from "@uthana/client";

const client = new UthanaClient(process.env.UTHANA_API_KEY!);

// Text to motion
const result = await client.ttm.create("a person waving");
console.log(result.motion_id);

// List motions
const motions = await client.motions.list();

// List characters
const characters = await client.characters.list();
```

### React

```tsx
import { UthanaProvider, useUthanaMotions, useUthanaTtm } from "@uthana/react";

function App() {
  return (
    <UthanaProvider apiKey={process.env.UTHANA_API_KEY!}>
      <Dashboard />
    </UthanaProvider>
  );
}

function Dashboard() {
  const { data: motions } = useUthanaMotions();
  const ttm = useUthanaTtm();

  return (
    <div>
      <button onClick={() => ttm.mutate({ prompt: "a person walking" })}>Generate</button>
      <ul>
        {motions?.map((m) => (
          <li key={m.id}>{m.name}</li>
        ))}
      </ul>
    </div>
  );
}
```

#### React setup options

The hooks require react-query. Choose the setup that fits your app:

**1. No react-query yet** — Use `UthanaProvider` alone. It creates a `QueryClient` and `QueryClientProvider` for you:

```tsx
<UthanaProvider apiKey={apiKey}>
  <App />
</UthanaProvider>
```

**2. Already have react-query** — Pass your `QueryClient` and wrap with your existing `QueryClientProvider`. `UthanaProvider` will not create a second one:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { UthanaProvider } from "@uthana/react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

export default function Layout({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      <UthanaProvider apiKey={apiKey} queryClient={queryClient}>
        {children}
      </UthanaProvider>
    </QueryClientProvider>
  );
}
```

**3. Prefer a singleton client** — Initialize once and use your own `QueryClientProvider`. No `UthanaProvider` needed:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createUthanaClient, useUthanaMotions } from "@uthana/react";

// Call once at app init (e.g. in layout or root)
createUthanaClient(apiKey);

const queryClient = new QueryClient();

export default function Layout({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
```

**4. Manual configuration** — If you want full control over your `QueryClient` (e.g. custom `QueryCache`, `MutationCache`, or defaults), create it yourself and use either option 2 or 3. The hooks use whatever `QueryClient` is in context via `useQueryClient()`, so your configuration applies to all Uthana queries and mutations:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createUthanaClient } from "@uthana/react";

const queryClient = new QueryClient({
  queryCache: yourQueryCache,
  mutationCache: yourMutationCache,
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
      staleTime: 60_000,
    },
  },
});

createUthanaClient(apiKey);

export default function Layout({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
```

## Text to motion (ttm)

Generate 3D character animations from natural language prompts.

```ts
import { UthanaClient, UthanaCharacters } from "@uthana/client";

const client = new UthanaClient(process.env.UTHANA_API_KEY!);

// Basic usage (default model: vqvae-v1)
const result = await client.ttm.create("a person walking forward");

// Use a specific character (default is Tar)
const result = await client.ttm.create("a person dancing", {
  character_id: UthanaCharacters.ava,
});

// Explicit model and advanced options
const result = await client.ttm.create("a person waving hello", {
  model: "diffusion-v2",
  character_id: UthanaCharacters.manny,
  length: 5.0,
  cfg_scale: 2.5,
  seed: 42,
  foot_ik: true,
  enhance_prompt: true,
  steps: 50,
  internal_ik: true,
});
```

**Models:** `vqvae-v1`, `diffusion-v2`, `flow-matching-v1`, or server aliases `text-to-motion`, `text-to-motion-bucmd`.

## Video to motion (vtm)

Extract motion capture from video files. Returns a job to poll until complete.

```ts
const job = await client.vtm.create(file, { motion_name: "my_dance" });

// Poll until finished
const finished = await client.jobs.wait(job.id!);
const motionId = finished.result?.result?.id;
```

## Characters

```ts
// Upload a character (GLB or FBX)
const result = await client.characters.create(file, {
  auto_rig: true,
  front_facing: true,
});

// List characters
const characters = await client.characters.list();

// Download character mesh
const buffer = await client.characters.download(characterId);

// Text-to-character pipeline: generate preview from text, then create character
const { character_id, images } = await client.characters.generate_from_text("a knight in armor");
const { character } = await client.characters.create_from_generated_image(
  character_id,
  images[0].key,
  "a knight in armor",
  { name: "Knight" },
);

// Image-to-character: upload image, then create character
const { character_id, image } = await client.characters.generate_from_image(imageFile);
const { character } = await client.characters.create_from_generated_image(
  character_id,
  image.key,
  "a knight in armor",
);

// Rename or delete
await client.characters.rename(characterId, "New Name");
await client.characters.delete(characterId);

// Create motion from GLTF content (bake)
const { motion_id } = await client.characters.create_from_gltf(gltfString, "My Motion");
```

## Motions

```ts
// List all motions
const motions = await client.motions.list();

// Get single motion
const motion = await client.motions.get(motionId);

// Download motion (GLB or FBX)
const buffer = await client.motions.download(characterId, motionId, {
  output_format: "glb",
  fps: 30,
  no_mesh: false,
});

// Download preview WebM (does not charge download seconds)
const preview = await client.motions.download_preview(characterId, motionId);

// Rate a motion (thumbs up/down)
await client.motions.rate(motionId, 1); // 1 = thumbs up, 0 = thumbs down

// Rename, delete, favorite
await client.motions.rename(motionId, "New Name");
await client.motions.delete(motionId);
await client.motions.favorite(motionId, true);
```

## Motion downloads

Check download quota and list downloaded motions.

```ts
// List motion downloads (for quota/usage)
const downloads = await client.motionDownloads.list();

// Check if download is allowed before downloading
const allowed = await client.motionDownloads.check_allowed(characterId, motionId);
if (allowed) {
  const buffer = await client.motions.download(characterId, motionId);
}
```

## Org and user

```ts
const user = await client.org.get_user();
const org = await client.org.get_org();
```

## Jobs

```ts
// List jobs (optionally filter by method)
const jobs = await client.jobs.list("VideoToMotion");

// Get job status
const job = await client.jobs.get(jobId);

// Wait until job finishes or fails (polls automatically)
const finished = await client.jobs.wait(jobId, {
  intervalMs: 5000,
  timeoutMs: 120000,
});
```

## Errors

```ts
import { UthanaError } from "@uthana/client";

try {
  await client.motions.download(cid, mid);
} catch (err) {
  if (err instanceof UthanaError) {
    console.error(err.statusCode, err.apiMessage);
  }
}
```

## React hooks

| Hook                                 | Description                            |
| ------------------------------------ | -------------------------------------- |
| `useUthanaMotions`                         | List motions                           |
| `useUthanaMotion(id)`                      | Get single motion                      |
| `useUthanaRateMotion`                      | Rate motion mutation                   |
| `useUthanaCharacters`                      | List characters                        |
| `useUthanaCreateCharacter`                 | Upload character mutation              |
| `useUthanaRenameCharacter`                 | Rename character mutation              |
| `useUthanaDeleteCharacter`                 | Delete character mutation              |
| `useUthanaGenerateCharacterFromText`       | Text-to-character preview mutation     |
| `useUthanaGenerateCharacterFromImage`      | Image-to-character preview mutation    |
| `useUthanaCreateCharacterFromImage`        | Create character from preview mutation |
| `useUthanaJobs(method?)`                   | List jobs                              |
| `useUthanaJob(id)`                         | Get job (polls when enabled)           |
| `useUthanaMotionDownloads`                 | List motion downloads                  |
| `useUthanaMotionDownloadAllowed(cid, mid)` | Check if download allowed              |
| `useUthanaUser`                            | Get current user                       |
| `useUthanaOrg`                             | Get org                                |
| `useUthanaTtm`                             | Text-to-motion mutation                |
| `useUthanaVtm`                             | Video-to-motion mutation               |

## Custom domain

```ts
const client = new UthanaClient(apiKey, {
  domain: "custom.uthana.com",
  timeout: 180,
});
```

## Development

```bash
npm install
npm run build
npm run lint
npm run format
npm run test:unit
```

- **lint** — ESLint
- **lint:fix** — ESLint with auto-fix
- **format** — Prettier
- **format:check** — Prettier check (no write)
- **test:coverage** — Unit tests with coverage report

Integration tests require `UTHANA_API_KEY`. You can set it via env or `.env.local`:

```bash
# Option 1: .env.local (gitignored)
# UTHANA_API_KEY=your_key
# UTHANA_DOMAIN=custom.uthana.com  # optional, for non-production

# Option 2: inline
UTHANA_API_KEY=your_key npm run test:integration
```

## VSCode

The repo includes `.vscode/settings.json` with format-on-save using Prettier. Install the recommended extensions (Prettier, ESLint) for the best experience.

## Codegen

Replace `uthana.schema` with your full schema, then:

```bash
npm run codegen
```
