import { createSignal } from "solid-js";

export interface User {
  id: number;
  email: string;
}

interface Session {
  user: User;
  token: string;
}

export class AuthError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

// A tab-scoped token survives reloads without persisting across browser sessions.
export function createAuth(
  storage: Pick<Storage, "getItem" | "setItem" | "removeItem">,
) {
  const [user, setUser] = createSignal<User | null>(null);
  const [busy, setBusy] = createSignal(false);
  const [error, setError] = createSignal("");
  let token = storage.getItem("orange-dawn-token");
  let pending = false;

  async function request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const response = await fetch(`/api/v1/${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
    token = null;
    storage.removeItem("orange-dawn-token");
    setUser(null);
  }

  async function run(operation: () => Promise<void>) {
    if (pending) return;
    pending = true;
    setBusy(true);
    setError("");
    try {
      await operation();
    } catch (cause) {
      if (cause instanceof AuthError && cause.status === 401) clear();
      setError(
        cause instanceof AuthError
          ? cause.message
          : "Unable to reach the server. Please try again.",
      );
    } finally {
      pending = false;
      setBusy(false);
    }
  }

  return {
    user,
    busy,
    error,
    restore: () =>
      run(async () => {
        if (!token) return;
        const session = await request<{ user: User }>("GET", "session");
        setUser(session.user);
      }),
    submit: (mode: "login" | "register", email: string) =>
      run(async () => {
        const result = await request<{ message: string }>(
          "POST",
          mode === "register" ? "users" : "session",
          { user: { email } },
        );
        setError(result.message);
      }),
    confirm: (linkToken: string) =>
      run(async () => {
        const session = await request<Session>("POST", "session", {
          user: { token: linkToken },
        });
        token = session.token;
        storage.setItem("orange-dawn-token", token);
        setUser(session.user);
      }),
    logout: () =>
      run(async () => {
        await request<undefined>("DELETE", "session");
        clear();
      }),
  };
}
