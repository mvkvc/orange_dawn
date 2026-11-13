/** @jsxImportSource @solidjs/web */
import { createEffect, onSettled, createContext, useContext } from "solid-js";
import { render } from "@solidjs/web";
import {
  createRouter,
  useNavigate,
  useLocation,
  type RouteSectionProps,
} from "@solidjs/router";
import { createAuth } from "./auth";

const AuthContext = createContext<ReturnType<typeof createAuth>>();
function Layout(props: RouteSectionProps) {
  const auth = createAuth(sessionStorage);
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
            id="nav-login"
            hidden={!!auth.user()}
            href="/users/log-in"
            class="btn btn-ghost btn-sm"
          >
            Log in
          </a>
          <details class="dropdown dropdown-end">
            <summary class="btn btn-ghost btn-sm">
              Theme <span aria-hidden="true">⌄</span>
            </summary>
            <ul
              class="dropdown-content menu z-10 mt-2 w-52 rounded-box border border-base-300 bg-base-100 p-2 shadow-lg"
              aria-label="Choose theme"
            >
              <li>
                <label class="flex gap-3">
                  <input
                    type="radio"
                    name="theme"
                    value="autumn"
                    class="radio radio-sm theme-controller"
                    checked
                  />
                  <span class="flex-1">Autumn</span>
                  <span
                    data-theme="autumn"
                    class="flex gap-1 rounded bg-base-100 p-1"
                    aria-hidden="true"
                  >
                    <span class="h-3 w-3 rounded bg-primary"></span>
                    <span class="h-3 w-3 rounded bg-secondary"></span>
                    <span class="h-3 w-3 rounded bg-accent"></span>
                  </span>
                </label>
              </li>
              <li>
                <label class="flex gap-3">
                  <input
                    type="radio"
                    name="theme"
                    value="business"
                    class="radio radio-sm theme-controller"
                  />
                  <span class="flex-1">Business</span>
                  <span
                    data-theme="business"
                    class="flex gap-1 rounded bg-base-100 p-1"
                    aria-hidden="true"
                  >
                    <span class="h-3 w-3 rounded bg-primary"></span>
                    <span class="h-3 w-3 rounded bg-secondary"></span>
                    <span class="h-3 w-3 rounded bg-accent"></span>
                  </span>
                </label>
              </li>
            </ul>
          </details>
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
              onClick={() => void auth.logout()}
              type="button"
              class="btn btn-ghost btn-sm"
            >
              Log out
            </button>
            <p
              id="account-status"
              role="status"
              class="text-error empty:hidden"
            ></p>
          </div>
        </nav>
      </header>
      {props.children}
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
      navigate(location.pathname, { replace: true });
      void auth.confirm(token);
    }
  });
  createEffect(
    () => auth.user(),
    (user) => {
      if (user) navigate("/", { replace: true });
    },
  );
  function submit(event: SubmitEvent & { currentTarget: HTMLFormElement }) {
    event.preventDefault();
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
        <form onSubmit={submit} id="auth-form" class="mt-8 space-y-4">
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
          <p
            id="auth-status"
            role="status"
            aria-live="polite"
            class="min-h-6 text-sm"
          >
            {auth.busy() ? "Please wait…" : auth.error()}
          </p>
          <button
            id="auth-submit"
            disabled={auth.busy()}
            type="submit"
            class="btn btn-primary w-full"
          >
            Email sign-in link
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
