# Uthana JS/TS Client

A JavaScript/TypeScript client for Uthana: generate lifelike human motion from text or 2D video, create and auto-rig characters, and manage your motions. Works in browser and Node.js.

## Packages

- **@uthana/client** — Core client (vanilla JS/TS, browser + Node.js)
- **@uthana/react** — React and react-query hooks

## Installation

```bash
npm install @uthana/client
# or for React
npm install @uthana/react @uthana/client
```

## Usage

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
import { UthanaProvider, useMotions, useTtm } from "@uthana/react";

function App() {
  return (
    <UthanaProvider apiKey={process.env.UTHANA_API_KEY!}>
      <Dashboard />
    </UthanaProvider>
  );
}

function Dashboard() {
  const { data: motions } = useMotions();
  const ttm = useTtm();

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

## Development

```bash
npm install
npm run build
npm run test:unit
```

Integration tests require `UTHANA_API_KEY`:

```bash
UTHANA_API_KEY=your_key npm run test
```

## Codegen

Replace `uthana.schema` with your full schema, then:

```bash
npm run codegen
```
