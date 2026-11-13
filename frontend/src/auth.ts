import { createSignal } from "solid-js";

export interface User {
  id: number;
  email: string;
}

interface Session {
  user: User;
  csrf_token: string;
}

export class AuthError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export function createAuth() {
  const [user, setUser] = createSignal<User | null>(null);
  const [busy, setBusy] = createSignal(false);
  const [notification, setNotification] = createSignal<{
    kind: "success" | "error";
    message: string;
  } | null>(null);
  let csrfToken: string | undefined;
  let pending = false;

  async function request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    if (method !== "GET" && !csrfToken) {
      const bootstrap = await request<{ csrf_token: string }>("GET", "session");
      csrfToken = bootstrap.csrf_token;
    }
    const response = await fetch(`/api/v1/${path}`, {
      method,
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        ...(csrfToken ? { "x-csrf-token": csrfToken } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (!response.ok) {
      const data = (await response.json()) as {
        errors: Record<string, string | string[]>;
      };
      const message = Object.entries(data.errors)
        .map(
          ([field, messages]) =>
            `${field === "detail" ? "" : `${field}: `}${Array.isArray(messages) ? messages.join(", ") : messages}`,
        )
        .join(". ");
      throw new AuthError(message, response.status);
    }
    return response.status === 204
      ? (undefined as T)
      : ((await response.json()) as T);
  }

  function clear() {
    csrfToken = undefined;
    setUser(null);
  }

  async function run(operation: () => Promise<void>) {
    if (pending) return;
    pending = true;
    setBusy(true);
    setNotification(null);
    try {
      await operation();
    } catch (cause) {
      if (cause instanceof AuthError && cause.status === 401) clear();
      setNotification({
        kind: "error",
        message:
          cause instanceof AuthError
            ? cause.message
            : "Unable to reach the server. Please try again.",
      });
    } finally {
      pending = false;
      setBusy(false);
    }
  }

  return {
    user,
    busy,
    notification,
    dismissNotification: () => setNotification(null),
    restore: () =>
      run(async () => {
        const session = await request<{
          user: User | null;
          csrf_token: string;
        }>("GET", "session");
        csrfToken = session.csrf_token;
        setUser(session.user);
      }),
    submit: (mode: "login" | "register", email: string) =>
      run(async () => {
        const result = await request<{ message: string }>(
          "POST",
          mode === "register" ? "users" : "session",
          { user: { email } },
        );
        setNotification({ kind: "success", message: result.message });
      }),
    confirm: (linkToken: string) =>
      run(async () => {
        const session = await request<Session>("POST", "session", {
          user: { token: linkToken },
        });
        csrfToken = session.csrf_token;
        setUser(session.user);
        setNotification({ kind: "success", message: "You’re logged in." });
      }),
    logout: () =>
      run(async () => {
        await request<undefined>("DELETE", "session");
        clear();
        setNotification({ kind: "success", message: "You’re logged out." });
      }),
  };
}
