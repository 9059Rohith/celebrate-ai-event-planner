"use client";
import Link from "next/link";
import { Moon, Sun, Plus, ArrowUpRight } from "lucide-react";
import { useSyncExternalStore } from "react";
import { useUIStore } from "@/lib/store/ui";
const subscribe = () => () => {};
export function Header() {
  const ready = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const theme = useUIStore((s) => s.theme);
  const setTheme = useUIStore((s) => s.setTheme);
  const currency = useUIStore((s) => s.currency);
  const setCurrency = useUIStore((s) => s.setCurrency);
  const dark = ready && theme === "dark";
  return (
    <header className="header">
      <Link href="/" className="brand">
        <span className="brand-icon">✳</span> celebrate<span>ai</span>
      </Link>
      <nav aria-label="Main navigation">
        <Link href="/#my-plans">My plans</Link>
        <Link href="/evals">
          Evaluations <ArrowUpRight size={13} />
        </Link>
        <select
          className="header-currency"
          aria-label="Default currency"
          value={ready ? currency : "INR"}
          onChange={(e) => setCurrency(e.target.value as typeof currency)}
        >
          {["INR", "USD", "EUR", "GBP"].map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <button
          className="icon-button"
          aria-label="Toggle dark mode"
          onClick={() => setTheme(dark ? "light" : "dark")}
        >
          {dark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <Link className="button small" href="/plan/new">
          <Plus size={16} /> New celebration
        </Link>
      </nav>
    </header>
  );
}
