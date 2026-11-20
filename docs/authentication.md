# Authenticate a client

Existing API-key construction is unchanged:

```typescript
const client = new UthanaClient(apiKey);
```

For delegated access, supply an empty API key and an access token:

```typescript
const client = new UthanaClient("", { accessToken });
```

The token is sent as Bearer authentication for GraphQL, file uploads and downloads. API keys use Basic authentication. Do not provide both. Tokens must be nonempty and contain no internal whitespace; surrounding whitespace is trimmed. The caller owns token refresh: construct a new client with the refreshed token. No credentials are logged or inserted into query keys.

## React

```tsx
<UthanaProvider apiKey="" options={{ accessToken }} queryScope="user-42:org-7">
  {children}
</UthanaProvider>
```

Delegated React access requires a public `queryScope` identifying the user and organization; never use a token as the scope. Use the same public scope during server rendering and hydration, and change it on account/organization changes. The default provider creates a fresh cache when credentials change. If supplying an external QueryClient, use a fresh or fully cleared cache for each credential change, including token refresh. A cache used for delegated access cannot be transferred to another client while populated, including when switching to API-key authentication or a different organization. Hydrate after the provider has claimed its initially empty cache. API-key-only integrations retain their existing external-cache behavior.

`createUthanaClient` replaces its singleton when credentials or options change. Do not use a process-global singleton for server-side requests from multiple users; create a request-local UthanaClient instead.
