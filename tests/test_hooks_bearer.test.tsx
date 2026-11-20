import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { OrgModule } from "@uthana/client";
import { UthanaProvider, useUthanaUser } from "@uthana/react";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

afterEach(() => vi.restoreAllMocks());
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
  expect(() => renderHook(() => useUthanaUser(), { wrapper: makeWrapper("second") })).toThrow(
    "new or cleared QueryClient",
  );
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
