import { afterEach, describe, expect, it, vi } from "vitest";
import { createRoot, flush } from "solid-js";
import { createAuth } from "../src/auth";

const user = { id: 1, email: "player@example.com" };
const disposers: (() => void)[] = [];
function setup(initialToken?: string) {
  const values = new Map<string, string>();
  if (initialToken) values.set("orange-dawn-token", initialToken);
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
  };
  const auth = createRoot((dispose) => {
    disposers.push(dispose);
    return createAuth(storage);
  });
  return { auth, storage };
}
function reply(body: unknown, status = 200) {
  return new Response(status === 204 ? null : JSON.stringify(body), { status });
}
afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose();
  vi.unstubAllGlobals();
});

describe("auth state", () => {
  it("exchanges an email link, stores the token and revokes it on logout", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(reply({ user, token: "secret" }))
      .mockResolvedValueOnce(reply(null, 204));
    vi.stubGlobal("fetch", fetch);
    const { auth, storage } = setup();
    await auth.confirm("email-link");
    flush();
    expect(auth.user()).toEqual(user);
    expect(storage.getItem("orange-dawn-token")).toBe("secret");
    expect(fetch.mock.calls[0]?.[0]).toBe("/api/v1/session");
    await auth.logout();
    flush();
    expect(fetch.mock.calls[1]?.[1]?.headers).toMatchObject({
      Authorization: "Bearer secret",
    });
    expect(auth.user()).toBeNull();
    expect(storage.getItem("orange-dawn-token")).toBeNull();
  });

  it("requests an email without creating a client session", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn<typeof fetch>()
        .mockResolvedValue(reply({ message: "Check your email." })),
    );
    const { auth, storage } = setup();
    await auth.submit("register", user.email);
    flush();
    expect(auth.user()).toBeNull();
    expect(auth.error()).toBe("Check your email.");
    expect(storage.getItem("orange-dawn-token")).toBeNull();
  });

  it("restores a saved session and clears an expired token", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(reply({ user }))
      .mockResolvedValueOnce(
        reply({ errors: { detail: "Please log in." } }, 401),
      );
    vi.stubGlobal("fetch", fetch);
    const { auth, storage } = setup("saved");
    await auth.restore();
    flush();
    expect(auth.user()).toEqual(user);
    await auth.restore();
    flush();
    expect(auth.user()).toBeNull();
    expect(storage.getItem("orange-dawn-token")).toBeNull();
    expect(auth.error()).toBe("Please log in.");
  });

  it("reports validation and network errors and releases busy state", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(
          reply({ errors: { password: ["is too short"] } }, 422),
        )
        .mockRejectedValueOnce(new TypeError("offline")),
    );
    const { auth } = setup();
    await auth.submit("login", user.email);
    flush();
    expect(auth.error()).toBe("password: is too short");
    expect(auth.user()).toBeNull();
    await auth.submit("login", user.email);
    flush();
    expect(auth.error()).toContain("Unable to reach the server");
    expect(auth.busy()).toBe(false);
  });

  it("keeps a session when logout fails so revocation can be retried", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(reply({ user }))
        .mockRejectedValueOnce(new TypeError("offline")),
    );
    const { auth, storage } = setup("saved");
    await auth.restore();
    await auth.logout();
    flush();
    expect(auth.user()).toEqual(user);
    expect(storage.getItem("orange-dawn-token")).toBe("saved");
  });
});
