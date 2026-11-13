import { afterEach, expect, it, vi } from "vitest";
import { createRoot, flush } from "solid-js";
import { createAuth } from "../src/auth";
let dispose: () => void;
afterEach(() => {
  dispose();
  vi.unstubAllGlobals();
});
function setup() {
  return createRoot((d) => {
    dispose = d;
    return createAuth();
  });
}
function reply(data: unknown) {
  return new Response(JSON.stringify(data));
}
it("restores cookie sessions and sends CSRF on token exchange and logout", async () => {
  const user = { id: 1, email: "player@example.com" };
  const fetch = vi
    .fn<typeof globalThis.fetch>()
    .mockResolvedValueOnce(reply({ user: null, csrf_token: "before" }))
    .mockResolvedValueOnce(reply({ user, csrf_token: "after" }))
    .mockResolvedValueOnce(new Response(null, { status: 204 }));
  vi.stubGlobal("fetch", fetch);
  const auth = setup();
  await auth.confirm("email-link");
  flush();
  expect(auth.user()).toEqual(user);
  expect(fetch.mock.calls[1]?.[1]?.headers).toMatchObject({
    "x-csrf-token": "before",
  });
  expect(fetch.mock.calls[1]?.[1]?.credentials).toBe("same-origin");
  await auth.logout();
  flush();
  expect(fetch.mock.calls[2]?.[1]?.headers).toMatchObject({
    "x-csrf-token": "after",
  });
  expect(auth.user()).toBeNull();
});
it("restores the user from a cookie without browser token storage", async () => {
  const user = { id: 2, email: "returning@example.com" };
  vi.stubGlobal(
    "fetch",
    vi
      .fn<typeof fetch>()
      .mockResolvedValue(reply({ user, csrf_token: "csrf" })),
  );
  const auth = setup();
  await auth.restore();
  flush();
  expect(auth.user()).toEqual(user);
});
