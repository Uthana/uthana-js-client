# @uthana/client

JavaScript/TypeScript client for [Uthana](https://uthana.com): text and video to motion, characters, motions, and jobs. Runs in the browser and Node.js.

📖 [API documentation](https://uthana.com/docs/api)

For **React** and **TanStack Query** hooks, use [**@uthana/react**](https://www.npmjs.com/package/@uthana/react).

## Install

```bash
npm install @uthana/client graffle graphql
```

`graffle` and `graphql` are **peer dependencies** (required at runtime).

## API key

Create an account at [uthana.com](https://uthana.com), then copy your API key from [account settings](https://uthana.com/app/settings).

## Quick start

```ts
import { UthanaClient } from "@uthana/client";

const client = new UthanaClient(process.env.UTHANA_API_KEY!);

const result = await client.ttm.create("a person waving");
console.log(result.motion_id);

const motions = await client.motions.list();
```

## Custom domain / timeout

```ts
const client = new UthanaClient(apiKey, {
  domain: "custom.uthana.com",
  timeout: 180,
});
```

## Errors

```ts
import { UthanaError } from "@uthana/client";

try {
  await client.motions.download(characterId, motionId);
} catch (err) {
  if (err instanceof UthanaError) {
    console.error(err.statusCode, err.apiMessage);
  }
}
```

## More examples

The [Uthana JS/TS monorepo](https://github.com/Uthana/uthana-js-client) README includes longer examples (characters, jobs, React hooks overview, codegen, and publishing notes). Those examples apply to this client where noted, or to `@uthana/react` for React-specific APIs.
