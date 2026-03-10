# Uthana JS/TS Client

A JavaScript/TypeScript client for Uthana: generate lifelike human motion from text or 2D video, create and auto-rig characters, and manage your motions. Works in browser and Node.js.

📖 [Full API documentation](https://uthana.com/docs/api) · 🤖 [Context7 page](https://context7.com/websites/uthana_api)

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
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
```

**4. Manual configuration** — Full control over your `QueryClient` (custom `QueryCache`, `MutationCache`, or defaults). The hooks use whatever `QueryClient` is in context via `useQueryClient()`, so your configuration applies to all Uthana queries and mutations:

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
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
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

**Available models:** `vqvae-v1`, `diffusion-v2`, `flow-matching-v1`.

```tsx
// React
import { useUthanaTtm } from "@uthana/react";

function GenerateButton() {
  const ttm = useUthanaTtm();

  return (
    <button onClick={() => ttm.mutate({ prompt: "a person walking" })} disabled={ttm.isPending}>
      {ttm.isPending ? "Generating…" : "Generate"}
    </button>
  );
}
```

## Video to motion (vtm)

Extract motion capture from video files. Returns a job to poll until complete.

```ts
const job = await client.vtm.create(file, { motion_name: "my_dance" });

// Poll until finished
const finished = await client.jobs.wait(job.id!);
const motionId = finished.result?.result?.id;
```

```tsx
// React
import { useUthanaVtm } from "@uthana/react";

function UploadVideo() {
  const vtm = useUthanaVtm();

  return (
    <input
      type="file"
      accept="video/*"
      onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) vtm.mutate({ file, motion_name: "my_dance" });
      }}
    />
  );
}
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

// Text-to-character: auto-pick first preview
const { character } = await client.characters.createFromText("a knight in armor", {
  name: "Knight",
  onPreviewsReady: (previews) => previews[0].key,
});

// Text-to-character: async callback (e.g. show a picker UI and await selection)
const { character } = await client.characters.createFromText("a knight in armor", {
  onPreviewsReady: async (previews) => {
    return await showPickerUI(previews); // returns selected key
  },
});

// Image-to-character: auto-confirms the single generated preview
const { character } = await client.characters.createFromImage(imageFile, {
  prompt: "a knight in armor",
});

// Rename or delete
await client.characters.rename(characterId, "New name");
await client.characters.delete(characterId);
```

```tsx
// React
import {
  useUthanaCharacters,
  useUthanaCreateCharacter,
  useUthanaRenameCharacter,
  useUthanaDeleteCharacter,
} from "@uthana/react";

// File upload — single step
function UploadCharacter() {
  const creator = useUthanaCreateCharacter();
  return (
    <input
      type="file"
      accept=".glb,.fbx"
      onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) creator.create({ from: "file", file, auto_rig: true });
      }}
    />
  );
}

// Text prompt — auto-select first preview
function GenerateFromPrompt() {
  const creator = useUthanaCreateCharacter();
  return (
    <button
      onClick={() =>
        creator.generate({
          from: "prompt",
          prompt: "a knight in armor",
          onPreviewsReady: (previews) => previews[0].key,
        })
      }
      disabled={creator.isPending}
    >
      Generate
    </button>
  );
}

// Text prompt — manual preview selection
function GenerateWithSelection() {
  const creator = useUthanaCreateCharacter();
  return (
    <>
      <button
        onClick={() => creator.generate({ from: "prompt", prompt: "a knight in armor" })}
        disabled={creator.isPending}
      >
        Generate previews
      </button>
      {creator.isAwaitingSelection && (
        <div>
          {creator.previews?.map((p) => (
            <img key={p.key} src={p.url} onClick={() => creator.confirm({ image_key: p.key })} />
          ))}
        </div>
      )}
    </>
  );
}

// List, rename, delete
function CharacterList() {
  const { data: characters } = useUthanaCharacters();
  const rename = useUthanaRenameCharacter();
  const remove = useUthanaDeleteCharacter();
  return (
    <ul>
      {characters?.map((c) => (
        <li key={c.id}>
          {c.name}
          <button onClick={() => rename.mutate({ character_id: c.id!, name: "New name" })}>
            Rename
          </button>
          <button onClick={() => remove.mutate({ character_id: c.id! })}>Delete</button>
        </li>
      ))}
    </ul>
  );
}
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
const preview = await client.motions.preview(characterId, motionId);

// Rate a motion (thumbs up/down)
await client.motions.rate(motionId, 1); // 1 = thumbs up, 0 = thumbs down

// Rename, delete, favorite
await client.motions.rename(motionId, "New Name");
await client.motions.delete(motionId);
await client.motions.favorite(motionId, true);

// Bake custom GLTF animation data as a new motion for an existing character
const { motion_id } = await client.motions.bakeWithChanges(gltfString, "My motion", {
  character_id: characterId,
});
```

```tsx
// React
import {
  useUthanaMotions,
  useUthanaMotion,
  useUthanaMotionPreview,
  useUthanaRateMotion,
  useUthanaBakeWithChanges,
} from "@uthana/react";

function MotionList() {
  const { data: motions } = useUthanaMotions();
  const rate = useUthanaRateMotion();

  return (
    <ul>
      {motions?.map((m) => (
        <li key={m.id}>
          {m.name}
          <button onClick={() => rate.mutate({ motion_id: m.id!, score: 1 })}>👍</button>
        </li>
      ))}
    </ul>
  );
}

// Single motion
function MotionDetail({ motionId }: { motionId: string }) {
  const { data: motion } = useUthanaMotion(motionId);
  return <div>{motion?.name}</div>;
}

// Preview WebM (does not charge download seconds)
function MotionPreview({ characterId, motionId }: { characterId: string; motionId: string }) {
  const { data: buffer } = useUthanaMotionPreview(characterId, motionId);
  const url = buffer ? URL.createObjectURL(new Blob([buffer], { type: "video/webm" })) : undefined;
  return url ? <video src={url} autoPlay loop muted /> : null;
}

// Bake custom GLTF animation data as a new motion
function BakeGltf({ characterId }: { characterId: string }) {
  const bake = useUthanaBakeWithChanges();
  return (
    <button
      onClick={() =>
        bake.mutate({ gltf_content: "<gltf/>", motion_name: "My motion", character_id: characterId })
      }
      disabled={bake.isPending}
    >
      {bake.isPending ? "Baking…" : "Bake changes"}
    </button>
  );
}
```

## Motion downloads

Check download quota and list downloaded motions.

```ts
// List motion downloads (for quota/usage)
const downloads = await client.motionDownloads.list();

// Check if download is allowed before downloading
const allowed = await client.motionDownloads.isAllowed(characterId, motionId);
if (allowed) {
  const buffer = await client.motions.download(characterId, motionId);
}
```

```tsx
// React
import { useUthanaMotionDownloads, useUthanaIsMotionDownloadAllowed } from "@uthana/react";

function DownloadButton({ characterId, motionId }: { characterId: string; motionId: string }) {
  const { data: allowed } = useUthanaIsMotionDownloadAllowed(characterId, motionId);
  return <button disabled={!allowed}>Download</button>;
}
```

## Org and user

```ts
const user = await client.org.getUser();
const org = await client.org.getOrg();
```

```tsx
// React
import { useUthanaUser, useUthanaOrg } from "@uthana/react";

function OrgInfo() {
  const { data: user } = useUthanaUser();
  const { data: org } = useUthanaOrg();
  return (
    <div>
      {user?.name} — {org?.name}
    </div>
  );
}
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

```tsx
// React
import { useUthanaJobs, useUthanaJob } from "@uthana/react";

function JobStatus({ jobId }: { jobId: string }) {
  const { data: job } = useUthanaJob(jobId);
  return <div>{job?.status}</div>;
}

function JobList() {
  const { data: jobs } = useUthanaJobs("VideoToMotion");
  return (
    <ul>
      {jobs?.map((j) => (
        <li key={j.id}>{j.status}</li>
      ))}
    </ul>
  );
}
```

## Accessing the client directly

If you need the `UthanaClient` instance outside of a module hook — for example to call methods not covered by a hook, or to use it in a utility function — you can access it two ways:

**In a component** — `useUthanaClient()` returns the client from context (or the singleton if no `UthanaProvider` is in the tree):

```tsx
import { useUthanaClient } from "@uthana/react";

function DownloadMotion({ characterId, motionId }: { characterId: string; motionId: string }) {
  const client = useUthanaClient();

  async function download() {
    const buffer = await client.motions.download(characterId, motionId);
    // ...
  }

  return <button onClick={download}>Download</button>;
}
```

**Outside of React** — `getUthanaClient()` returns the singleton directly. Requires `createUthanaClient(apiKey)` to have been called first:

```ts
import { getUthanaClient } from "@uthana/react";

const client = getUthanaClient();
const motions = await client.motions.list();
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

| Hook                                         | Description                               |
| -------------------------------------------- | ----------------------------------------- |
| `useUthanaMotions`                           | List motions                              |
| `useUthanaMotion(id)`                        | Get single motion                         |
| `useUthanaMotionPreview(cid, mid)`           | Fetch preview WebM (no quota charge)      |
| `useUthanaRateMotion`                        | Rate motion mutation                      |
| `useUthanaCharacters`                        | List characters                           |
| `useUthanaCreateCharacter`                   | Create character (file, prompt, or image) |
| `useUthanaRenameCharacter`                   | Rename character mutation                 |
| `useUthanaDeleteCharacter`                   | Delete character mutation                 |
| `useUthanaJobs(method?)`                     | List jobs                                 |
| `useUthanaJob(id)`                           | Get job (polls when enabled)              |
| `useUthanaMotionDownloads`                   | List motion downloads                     |
| `useUthanaIsMotionDownloadAllowed(cid, mid)` | Check if download allowed                 |
| `useUthanaUser`                              | Get current user                          |
| `useUthanaOrg`                               | Get org                                   |
| `useUthanaTtm`                               | Text-to-motion mutation                   |
| `useUthanaVtm`                               | Video-to-motion mutation                  |

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
