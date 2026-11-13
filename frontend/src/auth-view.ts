import { createEffect, createRoot } from "solid-js";
import { createAuth } from "./auth";

function element<T extends HTMLElement>(id: string, type: new () => T): T {
  const node = document.getElementById(id);
  if (!(node instanceof type)) throw new Error(`Missing #${id}`);
  return node;
}

// The game retains the Pixi JSX renderer. Native form controls provide keyboard,
// password-manager, and screen-reader support without changing that renderer.
export function mountAuth() {
  return createRoot((dispose) => {
    const auth = createAuth(sessionStorage);
    const panel = element("auth-panel", HTMLElement);
    const form = element("auth-form", HTMLFormElement);
    const email = element("email", HTMLInputElement);
    const submit = element("auth-submit", HTMLButtonElement);
    const toggle = element("auth-toggle", HTMLButtonElement);
    const logout = element("logout", HTMLButtonElement);
    const status = element("auth-status", HTMLElement);
    const account = element("account", HTMLElement);
    const heading = element("auth-heading", HTMLElement);
    let mode: "login" | "register" = "login";

    form.onsubmit = (event) => {
      event.preventDefault();
      void auth.submit(mode, email.value);
    };
    toggle.onclick = () => {
      mode = mode === "login" ? "register" : "login";
      const registering = mode === "register";
      heading.textContent = registering ? "Create your account" : "Log in";
      submit.textContent = registering
        ? "Create account"
        : "Email sign-in link";
      toggle.textContent = registering
        ? "Already have an account? Log in"
        : "New here? Create an account";
      status.textContent = "";
    };
    logout.onclick = () => {
      void auth.logout();
    };

    createEffect(
      () => ({ user: auth.user(), busy: auth.busy(), error: auth.error() }),
      ({ user, busy, error }) => {
        panel.hidden = !!user;
        element("game", HTMLElement).hidden = !user;
        account.hidden = !user;
        element("account-email", HTMLElement).textContent = user?.email ?? "";
        for (const input of [email, submit, toggle, logout])
          input.disabled = busy;
        status.textContent = busy ? "Please wait…" : error;
        element("account-status", HTMLElement).textContent = user ? error : "";
        form.setAttribute("aria-busy", String(busy));
      },
    );
    const linkToken = new URLSearchParams(location.hash.slice(1)).get("login");
    if (linkToken) {
      history.replaceState(null, "", location.pathname);
      void auth.confirm(linkToken);
    } else {
      void auth.restore();
    }
    return dispose;
  });
}
