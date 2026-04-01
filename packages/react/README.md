# @uthana/react

React components and [**TanStack Query**](https://tanstack.com/query) hooks for the [Uthana](https://uthana.com) API: motions, characters, text-to-motion, video-to-motion, jobs, and org helpers.

📖 [API documentation](https://uthana.com/docs/api)

The underlying HTTP/GraphQL client is [**@uthana/client**](https://www.npmjs.com/package/@uthana/client).

## Install

```bash
npm install @uthana/react @uthana/client @tanstack/react-query graffle graphql react
```

- **react** — peer dependency (`>= 18`).
- **@uthana/client**, **graffle**, and **graphql** — required alongside this package (versions should match your app; align `@uthana/client` with the range expected by `@uthana/react`).

## API key

Create an account at [uthana.com](https://uthana.com), then copy your API key from [account settings](https://uthana.com/app/settings).

## Quick start

Wrap your app with `UthanaProvider` (it sets up `QueryClientProvider` if you do not pass a `queryClient`):

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
  const { motions } = useUthanaMotions();
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

### Already using react-query?

Pass your `QueryClient` into `UthanaProvider` and keep your existing `QueryClientProvider` — see the [monorepo README](https://github.com/Uthana/uthana-js-client#react-setup-options) for patterns (shared client, singleton `createUthanaClient`, manual `QueryClient` configuration).

### Vanilla / non-React usage

Use **`@uthana/client`** only.

## Hooks overview

| Hook                             | Use            |
| -------------------------------- | -------------- |
| `useUthanaMotions`               | List motions   |
| `useUthanaMotion`                | Single motion  |
| `useUthanaTtm` / `useUthanaVtm`  | TTM / VTM jobs |
| `useUthanaCharacters`            | Characters     |
| `useUthanaJobs` / `useUthanaJob` | Jobs           |
| `useUthanaUser` / `useUthanaOrg` | User / org     |

Full table and examples: [monorepo README — React hooks](https://github.com/Uthana/uthana-js-client#react-hooks).

## Direct client access

```tsx
import { useUthanaClient } from "@uthana/react";
```

```ts
import { getUthanaClient, createUthanaClient } from "@uthana/react";
```

See the monorepo README section **“Accessing the client directly”**.

## More examples

The [Uthana JS/TS monorepo](https://github.com/Uthana/uthana-js-client) README has end-to-end snippets for characters, motions, jobs, errors, and development tooling.
