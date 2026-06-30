"use client";

import { useCallback, useSyncExternalStore } from "react";

export type Theme = "light" | "dark" | "deep-ink" | "twilight" | "claude" | "catppuccin";

export const THEMES: { id: Theme; label: string }[] = [
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
  { id: "deep-ink", label: "DeepInk" },
  { id: "twilight", label: "Twilight" },
  { id: "claude", label: "Claude" },
  { id: "catppuccin", label: "Catppuccin" },
];

const THEME_CLASSES: Theme[] = ["dark", "deep-ink", "twilight", "claude", "catppuccin"];

const listeners = new Set<() => void>();

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function getThemeClass(t: Theme): string {
  return t === "light" ? "" : t;
}

export function getTheme(): Theme {
  if (typeof document === "undefined") return "light";
  for (const cls of THEME_CLASSES) {
    if (document.documentElement.classList.contains(cls)) return cls;
  }
  return "light";
}

function getSnapshot(): Theme {
  return getTheme();
}

function getServerSnapshot(): Theme {
  return "light";
}

function applyTheme(theme: Theme) {
  for (const cls of THEME_CLASSES) {
    document.documentElement.classList.remove(cls);
  }
  const cls = getThemeClass(theme);
  if (cls) document.documentElement.classList.add(cls);
  try {
    localStorage.setItem("pi-theme", theme);
  } catch {
    // ignore storage errors
  }
  listeners.forEach((cb) => cb());
}

type ToggleOrigin = { x: number; y: number };

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setTheme = useCallback((theme: Theme, origin?: ToggleOrigin) => {
    const apply = () => applyTheme(theme);

    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const supportsVT = typeof document.startViewTransition === "function";

    if (!supportsVT || reduceMotion) {
      apply();
      return;
    }

    const x = origin?.x ?? window.innerWidth / 2;
    const y = origin?.y ?? window.innerHeight / 2;
    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y),
    );

    const transition = document.startViewTransition(apply);
    transition.ready
      .then(() => {
        document.documentElement.animate(
          {
            clipPath: [
              `circle(0px at ${x}px ${y}px)`,
              `circle(${endRadius}px at ${x}px ${y}px)`,
            ],
          },
          {
            duration: 450,
            easing: "cubic-bezier(0.22, 0.61, 0.36, 1)",
            pseudoElement: "::view-transition-new(root)",
          },
        );
      })
      .catch(() => {
        // transition cancelled — ignore
      });
  }, []);

  const toggleTheme = useCallback((origin?: ToggleOrigin) => {
    const current = getTheme();
    const next: Theme = current === "dark" ? "light" : "dark";
    setTheme(next, origin);
  }, [setTheme]);

  return { theme, setTheme, toggleTheme, isDark: theme === "dark" };
}
