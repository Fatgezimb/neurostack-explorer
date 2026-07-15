"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

const primaryLinks = [
  ["Lab", "/lab"],
  ["Pipeline", "/pipeline"],
  ["Data", "/data"],
  ["Models", "/models"],
  ["Visualizations", "/visualizations"],
] as const;

const toolLinks = [
  ["Python", "/tools/python", "Analysis language"],
  ["JupyterLab", "/tools/jupyterlab", "Reproducible notebook"],
  ["Pynapple", "/tools/pynapple", "Neural time series"],
  ["NeMoS", "/tools/nemos", "Neural GLMs"],
  ["plenoptic", "/tools/plenoptic", "Model-based synthesis"],
  ["Stan", "/tools/stan", "Bayesian uncertainty"],
  ["BridgeStan", "/tools/bridgestan", "Log density + gradients"],
  ["Figurl viewer", "/tools/figurl", "Shareable figures"],
  ["PyTorch", "/tools/pytorch", "Neural networks"],
  ["scikit-learn", "/tools/scikit-learn", "Leakage-safe baseline"],
  ["Plotly", "/tools/plotly", "Interactive charts"],
  ["NWB", "/tools/nwb", "Neurodata standard"],
] as const;

const commandLinks = [
  ...primaryLinks,
  ["All tools", "/tools"] as const,
  ...toolLinks.map(([label, href]) => [label, href] as const),
  ["Notebooks", "/notebooks"] as const,
  ["Methods", "/methods"] as const,
  ["Sources", "/sources"] as const,
  ["About", "/about"] as const,
  ["Limitations", "/limitations"] as const,
];

export function SiteHeader() {
  const [query, setQuery] = useState("");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  function openCommandPalette() {
    const dialog = dialogRef.current;
    if (!dialog || dialog.open) return;
    previousFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    dialog.showModal();
    requestAnimationFrame(() => searchRef.current?.focus());
  }

  function closeCommandPalette() {
    dialogRef.current?.close();
  }

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
    });
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        const dialog = dialogRef.current;
        if (dialog && !dialog.open) {
          previousFocusRef.current = document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;
          dialog.showModal();
          requestAnimationFrame(() => searchRef.current?.focus());
        }
      }
      if (event.key === "Escape") dialogRef.current?.close();
      if (event.key === "Tab" && dialogRef.current?.open) {
        const focusable = Array.from(
          dialogRef.current.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
          ),
        ).filter((element) => !element.hasAttribute("hidden"));
        const first = focusable[0];
        const last = focusable.at(-1);
        const active = document.activeElement;

        if (event.shiftKey && last && (active === first || !dialogRef.current.contains(active))) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && first && active === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener("keydown", onKey);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return commandLinks;
    return commandLinks.filter(([label, href]) =>
      `${label} ${href}`.toLowerCase().includes(normalized),
    );
  }, [query]);

  function toggleTheme() {
    const current = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
    const next = current === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = next;
    document.documentElement.style.colorScheme = next;
    localStorage.setItem("neurostack-theme", next);
    setTheme(next);
  }

  return (
    <header className="site-header">
      <div className="header-inner">
        <Link className="brand" href="/">
          <span aria-hidden="true" className="brand-mark">NS</span>
          <span>
            NeuroStack Explorer
            <small>Open neuroscience workflow</small>
          </span>
        </Link>

        <nav aria-label="Primary" className="desktop-nav">
          {primaryLinks.map(([label, href]) => (
            <Link href={href} key={href}>{label}</Link>
          ))}
        </nav>

        <details className="tools-menu">
          <summary>Tools</summary>
          <nav aria-label="Technology tools" className="tools-popover">
            {toolLinks.map(([label, href, note]) => (
              <Link href={href} key={href}>
                <strong>{label}</strong>
                <span>{note}</span>
              </Link>
            ))}
          </nav>
        </details>

        <button
          aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
          aria-pressed={theme === "dark"}
          className="header-action"
          onClick={toggleTheme}
          type="button"
        >
          ◐
        </button>
        <button
          aria-label="Open command palette"
          className="header-action"
          onClick={openCommandPalette}
          type="button"
        >
          Search <span className="shortcut">⌘K</span>
        </button>

        <dialog
          aria-labelledby="command-title"
          className="command-dialog"
          onClose={() => {
            setQuery("");
            previousFocusRef.current?.focus();
            previousFocusRef.current = null;
          }}
          ref={dialogRef}
        >
          <div className="command-head">
            <h2 className="visually-hidden" id="command-title">Search NeuroStack Explorer pages</h2>
            <label className="visually-hidden" htmlFor="command-search">Search pages</label>
            <input
              id="command-search"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search the explorer, tools, or methods…"
              ref={searchRef}
              value={query}
            />
            <button className="button-quiet" onClick={closeCommandPalette} type="button">
              Close
            </button>
          </div>
          <nav aria-label="Command results" className="command-list">
            {filtered.map(([label, href]) => (
              <Link href={href} key={href} onClick={closeCommandPalette}>
                <span>{label}</span>
                <span aria-hidden="true">→</span>
              </Link>
            ))}
            {filtered.length === 0 ? <p>No matching page.</p> : null}
          </nav>
        </dialog>
      </div>
    </header>
  );
}
