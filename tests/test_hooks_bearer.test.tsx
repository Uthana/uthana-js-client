import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { OrgModule } from "@uthana/client";
import { UthanaProvider, useUthanaClient, useUthanaUser } from "@uthana/react";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { getUthanaClient } from "../packages/react/src/client";

afterEach(() => vi.restoreAllMocks());
it("requires a fresh cache to leave delegated authentication and preserves API-key caches", () => {
  const cache = new QueryClient();
  const wrapper =
    ({
      apiKey,
      accessToken,
      queryClient = cache,
    }: {
      apiKey: string;
      accessToken?: string;
      queryClient?: QueryClient;
    }) =>
    ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <UthanaProvider
          apiKey={apiKey}
          options={{ accessToken }}
          queryScope="public-scope"
          queryClient={queryClient}
        >
          {children}
        </UthanaProvider>
      </QueryClientProvider>
    );
  const delegated = renderHook(() => useUthanaClient(), {
    wrapper: wrapper({ apiKey: "", accessToken: "token" }),
  });
  delegated.unmount();
  cache.clear();
  const quiet = vi.spyOn(console, "error").mockImplementation(() => {});
  try {
    expect(() =>
      renderHook(() => useUthanaClient(), { wrapper: wrapper({ apiKey: "first-key" }) }),
    ).toThrow("new QueryClient");
    const basicCache = new QueryClient();
    const basic = renderHook(() => useUthanaClient(), {
      wrapper: wrapper({ apiKey: "first-key", queryClient: basicCache }),
    });
    basicCache.setQueryData(["example"], "app-managed API-key data");
    basic.unmount();
    const next = renderHook(() => useUthanaClient(), {
      wrapper: wrapper({ apiKey: "second-key", queryClient: basicCache }),
    });
    expect(next.result.current.apiKey).toBe("second-key");
    next.unmount();
    expect(() =>
      renderHook(() => useUthanaClient(), {
        wrapper: wrapper({ apiKey: "", accessToken: "token", queryClient: basicCache }),
      }),
    ).toThrow("new QueryClient");
  } finally {
    quiet.mockRestore();
  }
});
it.each([
  { accessToken: "first-token", queryScope: "second-org" },
  { accessToken: "second-token", queryScope: "first-org" },
])("rejects a second owner of an empty external cache: %s", ({ accessToken, queryScope }) => {
  const cache = new QueryClient();
  const wrapper =
    (token: string, scope: string) =>
    ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={cache}>
        <UthanaProvider
          apiKey=""
          options={{ accessToken: token }}
          queryScope={scope}
          queryClient={cache}
        >
          {children}
        </UthanaProvider>
      </QueryClientProvider>
    );
  renderHook(() => useUthanaClient(), { wrapper: wrapper("first-token", "first-org") });
  expect(cache.getQueryCache().getAll()).toHaveLength(0);
  const working = getUthanaClient();
  const quiet = vi.spyOn(console, "error").mockImplementation(() => {});
  try {
    expect(() =>
      renderHook(() => useUthanaClient(), { wrapper: wrapper(accessToken, queryScope) }),
    ).toThrow("new QueryClient");
    expect(getUthanaClient()).toBe(working);
  } finally {
    quiet.mockRestore();
  }
});
it.each([
  { hasExternalCache: false, isRemount: false },
  { hasExternalCache: true, isRemount: false },
  { hasExternalCache: true, isRemount: true },
])(
  "preserves equivalent delegated owners across multiple providers: %s",
  async ({ hasExternalCache, isRemount }) => {
    const getUser = vi.spyOn(OrgModule.prototype, "getUser").mockResolvedValue({
      id: "first-user",
      name: "One",
      email: "one@example.com",
    });
    const cache = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } });
    const wrapper = ({ children }: { children: React.ReactNode }) => {
      const content = (
        <UthanaProvider
          apiKey=""
          options={{ accessToken: "first-token" }}
          queryScope="first-org"
          queryClient={hasExternalCache ? cache : undefined}
        >
          {children}
        </UthanaProvider>
      );
      return hasExternalCache ? (
        <QueryClientProvider client={cache}>{content}</QueryClientProvider>
      ) : (
        content
      );
    };
    const first = renderHook(() => useUthanaUser(), { wrapper });
    await waitFor(() => expect(first.result.current.user?.id).toBe("first-user"));
    getUser.mockResolvedValue({ id: "second-user", name: "Two", email: "two@example.com" });
    const second = renderHook(() => useUthanaUser(), {
      wrapper: ({ children }) => (
        <UthanaProvider apiKey="" options={{ accessToken: "second-token" }} queryScope="second-org">
          {children}
        </UthanaProvider>
      ),
    });
    await waitFor(() => expect(second.result.current.user?.id).toBe("second-user"));
    if (isRemount) {
      first.unmount();
      const remounted = renderHook(() => useUthanaUser(), { wrapper });
      await waitFor(() => expect(remounted.result.current.user?.id).toBe("first-user"));
    } else {
      first.rerender();
      expect(first.result.current.user?.id).toBe("first-user");
    }
    expect(getUser).toHaveBeenCalledTimes(2);
  },
);
it("creates a fresh default cache when delegated credentials change", async () => {
  const getUser = vi
    .spyOn(OrgModule.prototype, "getUser")
    .mockResolvedValue({ id: "user-one", name: "One", email: "one@example.com" });
  let accessToken = "first-token";
  let queryScope = "user-one:org-one";
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <UthanaProvider apiKey="" options={{ accessToken }} queryScope={queryScope}>
      {children}
    </UthanaProvider>
  );
  const { result, rerender } = renderHook(() => useUthanaUser(), { wrapper });
  await waitFor(() => expect(result.current.user?.id).toBe("user-one"));
  accessToken = "second-token";
  queryScope = "user-two:org-two";
  getUser.mockResolvedValue({ id: "user-two", name: "Two", email: "two@example.com" });
  rerender();
  expect(result.current.user?.id).not.toBe("user-one");
  await waitFor(() => expect(result.current.user?.id).toBe("user-two"));
});
it("rejects a populated external cache when delegated credentials change", async () => {
  vi.spyOn(OrgModule.prototype, "getUser").mockResolvedValue({
    id: "user-one",
    name: "One",
    email: "one@example.com",
  });
  const cache = new QueryClient();
  const makeWrapper =
    (accessToken: string) =>
    ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={cache}>
        <UthanaProvider
          apiKey=""
          options={{ accessToken }}
          queryScope="public-account"
          queryClient={cache}
        >
          {children}
        </UthanaProvider>
      </QueryClientProvider>
    );
  const first = renderHook(() => useUthanaUser(), { wrapper: makeWrapper("first") });
  await waitFor(() => expect(first.result.current.user?.id).toBe("user-one"));
  first.unmount();
  const quiet = vi.spyOn(console, "error").mockImplementation(() => {});
  const working = getUthanaClient();
  expect(() => renderHook(() => useUthanaUser(), { wrapper: makeWrapper("second") })).toThrow(
    "new QueryClient",
  );
  expect(getUthanaClient()).toBe(working);
  quiet.mockRestore();
});
it("requires a public scope for delegated React access", () => {
  const quiet = vi.spyOn(console, "error").mockImplementation(() => {});
  expect(() =>
    renderHook(() => useUthanaUser(), {
      wrapper: ({ children }) => (
        <UthanaProvider apiKey="" options={{ accessToken: "token" }}>
          {children}
        </UthanaProvider>
      ),
    }),
  ).toThrow("queryScope");
  quiet.mockRestore();
});

it.each([
  { apiKey: "api-key-account", accessToken: undefined, queryScope: undefined },
  { apiKey: "", accessToken: "same-token", queryScope: "other-org" },
])("protects delegated caches on auth mode or organization changes: %s", async (next) => {
  vi.spyOn(OrgModule.prototype, "getUser").mockResolvedValue({
    id: "user-one",
    name: "One",
    email: "one@example.com",
  });
  const cache = new QueryClient();
  const makeWrapper =
    (apiKey: string, accessToken: string | undefined, queryScope: string | undefined) =>
    ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={cache}>
        <UthanaProvider
          apiKey={apiKey}
          options={{ accessToken }}
          queryScope={queryScope}
          queryClient={cache}
        >
          {children}
        </UthanaProvider>
      </QueryClientProvider>
    );
  const first = renderHook(() => useUthanaUser(), {
    wrapper: makeWrapper("", "same-token", "public-account"),
  });
  await waitFor(() => expect(first.result.current.user?.id).toBe("user-one"));
  first.unmount();
  const quiet = vi.spyOn(console, "error").mockImplementation(() => {});
  expect(() =>
    renderHook(() => useUthanaUser(), {
      wrapper: makeWrapper(next.apiKey, next.accessToken, next.queryScope),
    }),
  ).toThrow("new QueryClient");
  quiet.mockRestore();
});

it("remounts default query observers when only the organization scope changes", async () => {
  const getUser = vi.spyOn(OrgModule.prototype, "getUser").mockResolvedValue({
    id: "first-user",
    name: "One",
    email: "one@example.com",
  });
  const options = { accessToken: "unchanged-token" };
  let queryScope = "org-one";
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <UthanaProvider apiKey="" options={options} queryScope={queryScope}>
      {children}
    </UthanaProvider>
  );
  const { result, rerender } = renderHook(() => useUthanaUser(), { wrapper });
  await waitFor(() => expect(result.current.user?.id).toBe("first-user"));
  getUser.mockResolvedValue({ id: "second-user", name: "Two", email: "two@example.com" });
  queryScope = "org-two";
  rerender();
  expect(result.current.user?.id).not.toBe("first-user");
  await waitFor(() => expect(result.current.user?.id).toBe("second-user"));
  expect(getUser).toHaveBeenCalledTimes(2);
});
