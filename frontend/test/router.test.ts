// @vitest-environment jsdom
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { flush } from "solid-js";
import { mountApp } from "../src/app.dom";

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn<typeof fetch>()
      .mockImplementation(() =>
        Promise.resolve(
          new Response(JSON.stringify({ user: null, csrf_token: "csrf" })),
        ),
      ),
  );
});
let dispose: (() => void) | undefined;
afterEach(() => {
  dispose?.();
  document.body.replaceChildren();
  vi.unstubAllGlobals();
  sessionStorage.clear();
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
});

it("navigates between real pages without replacing the shared navbar", async () => {
  history.replaceState(null, "", "/");
  vi.stubGlobal("scrollTo", vi.fn());
  const root = document.createElement("div");
  document.body.append(root);
  dispose = mountApp(root);
  flush();
  await vi.waitFor(() => {
    expect(root.querySelector("nav")).not.toBeNull();
  });
  const navbar = root.querySelector("nav");
  expect(root.querySelector("form")).toBeNull();
  const authLinks = Array.from(root.querySelectorAll("nav a")).map((link) =>
    link.textContent?.trim(),
  );
  expect(authLinks).toEqual([
    "Orange Dawn",
    "Home",
    "Create account",
    "Log in",
  ]);
  root.querySelector<HTMLAnchorElement>('[href="/users/log-in"]')?.click();
  await vi.waitFor(() => {
    expect(root.querySelector("h1")?.textContent).toBe("Log in");
  });
  expect(location.pathname).toBe("/users/log-in");
  expect(root.querySelector("nav")).toBe(navbar);
  root.querySelector<HTMLAnchorElement>('[href="/users/register"]')?.click();
  await vi.waitFor(() => {
    expect(root.querySelector("h1")?.textContent).toBe("Create your account");
  });
  history.back();
  await vi.waitFor(() => {
    expect(root.querySelector("h1")?.textContent).toBe("Log in");
  });
});

it("renders a not-found page for an unknown direct URL", async () => {
  history.replaceState(null, "", "/missing");
  const root = document.createElement("div");
  document.body.append(root);
  dispose = mountApp(root);
  flush();
  await vi.waitFor(() => {
    expect(root.textContent).toContain("Page not found");
  });
});

it("offers light, dark and system appearance and remembers the selection", async () => {
  history.replaceState(null, "", "/");
  localStorage.setItem("orange-dawn-appearance", "dark");
  const root = document.createElement("div");
  document.body.append(root);
  dispose = mountApp(root);
  flush();
  await vi.waitFor(() => {
    expect(document.documentElement.dataset.theme).toBe("business");
  });
  expect(root.textContent).not.toContain("Autumn");
  expect(root.textContent).not.toContain("Business");
  expect(root.querySelector('button[aria-label="Light"]')).not.toBeNull();
  root.querySelector("details")?.setAttribute("open", "");
  root.querySelector<HTMLButtonElement>('button[aria-label="Light"]')?.click();
  await vi.waitFor(() => {
    expect(document.documentElement.dataset.theme).toBe("autumn");
  });
  expect(localStorage.getItem("orange-dawn-appearance")).toBe("light");
  root.querySelector<HTMLButtonElement>('button[aria-label="System"]')?.click();
  await vi.waitFor(() => {
    expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
  });
  expect(localStorage.getItem("orange-dawn-appearance")).toBe("system");
});

it("exchanges an emailed token and shows the signed-in home", async () => {
  history.replaceState(null, "", "/users/log-in#login=emailed-token");
  vi.stubGlobal("scrollTo", vi.fn());
  const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
    new Response(
      JSON.stringify({
        user: { id: 1, email: "player@example.com" },
        csrf_token: "new-csrf",
      }),
    ),
  );
  fetch.mockResolvedValueOnce(
    new Response(JSON.stringify({ user: null, csrf_token: "csrf" })),
  );
  vi.stubGlobal("fetch", fetch);
  const root = document.createElement("div");
  document.body.append(root);
  dispose = mountApp(root);
  flush();
  await vi.waitFor(() => {
    expect(fetch).toHaveBeenCalled();
  });
  expect(fetch.mock.calls[1]?.[1]?.body).toBe(
    JSON.stringify({ user: { token: "emailed-token" } }),
  );
  await vi.waitFor(() => {
    expect(location.pathname).toBe("/");
  });
  expect(root.querySelector<HTMLElement>("#account")?.hidden).toBe(false);
  expect(root.querySelector<HTMLElement>("#nav-home")?.hidden).toBe(false);
  expect(root.querySelector<HTMLElement>("#logout")?.hidden).toBe(false);
  expect(root.querySelector<HTMLElement>("#nav-login")?.hidden).toBe(true);
  expect(root.querySelector<HTMLElement>("#nav-register")?.hidden).toBe(true);
  expect(sessionStorage.getItem("orange-dawn-token")).toBeNull();
  expect(root.querySelector('.toast [role="status"]')?.textContent).toContain(
    "You’re logged in.",
  );
  fetch.mockResolvedValueOnce(new Response(null, { status: 204 }));
  root.querySelector<HTMLButtonElement>("#logout")?.click();
  await vi.waitFor(() => {
    expect(root.querySelector<HTMLElement>("#account")?.hidden).toBe(true);
  });
  expect(root.querySelector<HTMLElement>("#nav-register")?.hidden).toBe(false);
  expect(root.querySelector<HTMLElement>("#nav-home")?.hidden).toBe(false);
  expect(root.querySelector<HTMLElement>("#logout")?.hidden).toBe(true);
  expect(root.querySelector('.toast [role="status"]')?.textContent).toContain(
    "You’re logged out.",
  );
});

it("shows dismissible auth notifications outside the form", async () => {
  history.replaceState(null, "", "/users/register");
  const fetch = vi
    .fn<typeof globalThis.fetch>()
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ user: null, csrf_token: "csrf" })),
    )
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({ message: "Check your email for a sign-in link." }),
      ),
    )
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({ errors: { email: ["has already been taken"] } }),
        { status: 422 },
      ),
    );
  vi.stubGlobal("fetch", fetch);
  const root = document.createElement("div");
  document.body.append(root);
  dispose = mountApp(root);
  flush();
  await vi.waitFor(() => {
    expect(
      root.querySelector<HTMLButtonElement>("#auth-submit")?.disabled,
    ).toBe(false);
  });
  const email = root.querySelector<HTMLInputElement>("#email");
  if (!email) throw new Error("Missing email field");
  email.value = "player@example.com";
  const form = root.querySelector("form");
  expect(form?.querySelector('[role="status"]')).toBeNull();
  form?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  await vi.waitFor(() => {
    expect(root.querySelector('.toast [role="status"]')?.textContent).toContain(
      "Check your email",
    );
  });
  root
    .querySelector<HTMLButtonElement>('[aria-label="Dismiss notification"]')
    ?.click();
  await vi.waitFor(() => {
    expect(root.querySelector(".toast")).toBeNull();
  });
  form?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  await vi.waitFor(() => {
    expect(root.querySelector('.toast [role="alert"]')?.textContent).toContain(
      "has already been taken",
    );
  });
});
