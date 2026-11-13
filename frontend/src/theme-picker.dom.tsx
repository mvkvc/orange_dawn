/** @jsxImportSource @solidjs/web */
import { createEffect, createSignal, For } from "solid-js";

type Appearance = "light" | "dark" | "system";
const storageKey = "orange-dawn-appearance";
const options = [
  {
    value: "light",
    label: "Light",
    path: "M12 3v1m0 16v1M3 12h1m16 0h1M5.6 5.6l.7.7m11.4 11.4.7.7M5.6 18.4l.7-.7M17.7 6.3l.7-.7M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
  },
  {
    value: "dark",
    label: "Dark",
    path: "M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z",
  },
  { value: "system", label: "System", path: "M3 4h18v13H3ZM8 21h8m-4-4v4" },
] as const;

function savedAppearance(): Appearance {
  try {
    const value = localStorage.getItem(storageKey);
    if (value === "light" || value === "dark") return value;
  } catch {
    /* Storage can be unavailable in restricted browser contexts. */
  }
  return "system";
}

export function ThemePicker() {
  const [appearance, setAppearance] =
    createSignal<Appearance>(savedAppearance());
  createEffect(appearance, (value) => {
    // DaisyUI's prefersdark theme follows OS changes when no theme is forced.
    if (value === "system")
      document.documentElement.removeAttribute("data-theme");
    else
      document.documentElement.dataset.theme =
        value === "light" ? "autumn" : "business";
    try {
      localStorage.setItem(storageKey, value);
    } catch {
      /* Selection still works without persistence. */
    }
  });

  return (
    <details class="dropdown dropdown-end">
      <summary
        class="btn btn-ghost btn-square btn-sm"
        aria-label="Appearance"
        title="Appearance"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="size-5"
          aria-hidden="true"
        >
          <path
            d={options.find((option) => option.value === appearance())?.path}
          />
        </svg>
      </summary>
      <fieldset class="dropdown-content z-10 mt-2 w-40 rounded-box border border-base-300 bg-base-100 p-2 shadow-lg">
        <legend class="sr-only">Appearance</legend>
        <For each={options}>
          {(option) => (
            <button
              type="button"
              aria-label={option.label}
              aria-pressed={appearance() === option.value ? "true" : "false"}
              ref={(button) => {
                button.addEventListener("click", () =>
                  setAppearance(option.value),
                );
              }}
              class="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 hover:bg-base-200 aria-pressed:bg-base-200"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="size-5"
                aria-hidden="true"
              >
                <path d={option.path} />
              </svg>
              <span class="flex-1 text-sm">{option.label}</span>
            </button>
          )}
        </For>
      </fieldset>
    </details>
  );
}
