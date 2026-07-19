"use client";

import { useState } from "react";

type Tema = "system" | "light" | "dark";

const OPCIONES: { value: Tema; label: string }[] = [
  { value: "system", label: "Sistema" },
  { value: "light", label: "Claro" },
  { value: "dark", label: "Oscuro" },
];

function temaGuardado(): Tema {
  if (typeof window === "undefined") return "system";
  const stored = window.localStorage.getItem("cco-theme");
  return stored === "light" || stored === "dark" ? stored : "system";
}

export default function ThemeToggle() {
  const [tema, setTema] = useState<Tema>(temaGuardado);

  function aplicar(nuevo: Tema) {
    setTema(nuevo);
    if (nuevo === "system") {
      localStorage.removeItem("cco-theme");
      document.documentElement.removeAttribute("data-theme");
    } else {
      localStorage.setItem("cco-theme", nuevo);
      document.documentElement.setAttribute("data-theme", nuevo);
    }
  }

  return (
    <div className="flex gap-2">
      {OPCIONES.map((o) => (
        <button
          key={o.value}
          onClick={() => aplicar(o.value)}
          className={`rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${
            tema === o.value
              ? "bg-surface-2 border-accent-blue text-foreground"
              : "border-border-subtle text-muted hover:text-foreground"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
