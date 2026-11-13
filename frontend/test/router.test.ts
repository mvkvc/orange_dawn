// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { flush } from "solid-js";
import { mountApp } from "../src/app.dom";

let dispose: (() => void) | undefined;
afterEach(() => {
  dispose?.();
  document.body.replaceChildren();
  vi.unstubAllGlobals();
  sessionStorage.clear();
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
