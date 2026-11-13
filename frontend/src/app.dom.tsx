/** @jsxImportSource @solidjs/web */
import {
  createEffect,
  onSettled,
  createContext,
  useContext,
  Show,
} from "solid-js";
import { render } from "@solidjs/web";
import {
  createRouter,
  useNavigate,
  useLocation,
  type RouteSectionProps,
} from "@solidjs/router";
import { ThemePicker } from "./theme-picker.dom";
import { createAuth } from "./auth";

const AuthContext = createContext<ReturnType<typeof createAuth>>();
function Layout(props: RouteSectionProps) {
  const auth = createAuth();
  onSettled(() => {
    if (!new URLSearchParams(window.location.hash.slice(1)).has("login"))
      void auth.restore();
  });
  return (
    <AuthContext value={auth}>
      {" "}
      <header class="border-b border-base-300">
        <nav
          class="navbar mx-auto max-w-6xl gap-4 px-6"
          aria-label="Main navigation"
        >
          <a href="/" class="flex-1 text-xl font-bold tracking-tight">
            Orange Dawn
          </a>
          <a
            id="nav-register"
            hidden={!!auth.user()}
            href="/users/register"
            class="btn btn-ghost btn-sm"
          >
            Create account
          </a>
          <a
            id="nav-login"
            hidden={!!auth.user()}
            href="/users/log-in"
            class="btn btn-ghost btn-sm"
          >
            Log in
          </a>
          <ThemePicker />
          <div
            id="account"
            class="flex items-center gap-3"
            hidden={!auth.user()}
          >
            <span id="account-email" class="hidden text-sm sm:inline">
              {auth.user()?.email}
            </span>
            <button
              id="logout"
              disabled={auth.busy()}
              ref={(button) => {
                button.addEventListener("click", () => {
                  void auth.logout();
                });
              }}
              type="button"
              class="btn btn-ghost btn-sm"
            >
              Log out
            </button>
          </div>
        </nav>
      </header>
      {props.children}
      <Show when={auth.notification()}>
        {(notice) => (
          <div class="toast toast-end z-50 max-w-full p-4">
            <div
              class={[
                "alert max-w-sm shadow-lg",
                {
                  "alert-success": notice().kind === "success",
                  "alert-error": notice().kind === "error",
                },
              ]}
              role={notice().kind === "error" ? "alert" : "status"}
            >
              <span>{notice().message}</span>
              <button
                type="button"
                class="btn btn-ghost btn-square btn-sm"
                aria-label="Dismiss notification"
                ref={(button) => {
                  button.addEventListener("click", auth.dismissNotification);
                }}
              >
                <svg
                  class="size-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  aria-hidden="true"
                >
                  <path d="m6 6 12 12M6 18 18 6" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </Show>
    </AuthContext>
  );
}
function AuthPage(props: { register?: boolean }) {
  const auth = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  onSettled(() => {
    const token = new URLSearchParams(location.hash.slice(1)).get("login");
    if (token) {
      const path = location.pathname;
      queueMicrotask(() => {
        navigate(path, { replace: true });
        void auth.confirm(token);
      });
    }
  });
  createEffect(
    () => auth.user(),
    (user) => {
      if (user)
        queueMicrotask(() => {
          navigate("/", { replace: true });
        });
    },
  );
  function submit(event: Event) {
    event.preventDefault();
    if (!(event.currentTarget instanceof HTMLFormElement)) return;
    const email = new FormData(event.currentTarget).get("email");
    if (typeof email === "string")
      void auth.submit(props.register ? "register" : "login", email);
  }
  return (
    <main
      id="auth-panel"
      class="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-6xl items-center justify-center px-6 py-12"
    >
      <section class="w-full max-w-sm" aria-labelledby="auth-heading">
        <h1 id="auth-heading" class="text-3xl font-semibold">
          {props.register ? "Create your account" : "Log in"}
        </h1>
        <p class="mt-3 text-base-content/70">
          We'll email you a link to sign in.
        </p>
        <form
          ref={(form) => {
            form.addEventListener("submit", submit);
          }}
          id="auth-form"
          class="mt-8 space-y-4"
        >
          <label for="email" class="label">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autocomplete="email"
            maxlength="160"
            disabled={auth.busy()}
            required
            class="input w-full"
          />
          <button
            id="auth-submit"
            disabled={auth.busy()}
            type="submit"
            class="btn btn-primary w-full"
          >
            {auth.busy() ? "Please wait…" : "Email sign-in link"}
          </button>
        </form>
        <a
          href={props.register ? "/users/log-in" : "/users/register"}
          class="btn btn-link mt-4 px-0"
        >
          {props.register
            ? "Already have an account? Log in"
            : "New here? Create an account"}
        </a>
      </section>
    </main>
  );
}
export const Router = createRouter({
  routes: [
    { path: "/", component: () => <main /> },
    { path: "/users/log-in", component: () => <AuthPage /> },
    { path: "/users/register", component: () => <AuthPage register /> },
    {
      path: "*404",
      component: () => (
        <main class="p-12 text-center">
          <h1 class="text-3xl">Page not found</h1>
          <a href="/" class="btn btn-link">
            Go home
          </a>
        </main>
      ),
    },
  ],
});
export function mountApp(root: HTMLElement) {
  return render(
    () => <Router>{(props) => <Layout {...props} />}</Router>,
    root,
  );
}
