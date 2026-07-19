"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";

const NAV_ITEMS = [
  { code: "IN", label: "Inicio", href: "/" },
  { code: "BA", label: "Bandeja", href: "/bandeja" },
  { code: "PR", label: "Proyectos", href: "/proyectos" },
  { code: "AC", label: "Acciones", href: "/acciones" },
  { code: "DE", label: "Decisiones", href: "/decisiones" },
  { code: "EC", label: "Economía", href: "/economia" },
  { code: "ES", label: "Estadísticas", href: "/estadisticas" },
  { code: "EV", label: "Evidencias", href: "/evidencias" },
  { code: "CO", label: "Configuración", href: "/configuracion" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const modoEnfoque = useAppStore((s) => s.modoEnfoque);
  const toggleModoEnfoque = useAppStore((s) => s.toggleModoEnfoque);

  async function handleLogout() {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-border-subtle bg-surface px-4 py-5">
      <div className="mb-8 px-2">
        <div className="text-base font-bold tracking-tight">C.C.O. E.V.</div>
        <div className="text-xs text-muted mt-1 leading-snug">
          Tu realidad analizada. Tus decisiones con dirección.
        </div>
      </div>

      <nav className="flex-1 space-y-1">
        {NAV_ITEMS.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                active
                  ? "bg-surface-2 text-foreground font-medium"
                  : "text-muted hover:bg-surface-2 hover:text-foreground"
              }`}
            >
              <span
                className={`flex h-6 w-8 items-center justify-center rounded-md text-[10px] font-bold tracking-wide ${
                  active ? "bg-accent-blue/20 text-accent-blue" : "bg-overlay/5 text-muted"
                }`}
              >
                {item.code}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-4 border-t border-border-subtle pt-4">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-blue/20 text-accent-blue text-xs font-bold">
              E
            </span>
            <span className="text-sm">Eduardo</span>
          </div>
          <button
            onClick={toggleModoEnfoque}
            title="Modo enfoque — reduce la salida a 1 alerta + 1 acción"
            className={`relative h-5 w-9 rounded-full transition-colors ${
              modoEnfoque ? "bg-accent-blue" : "bg-overlay/10"
            }`}
          >
            <span
              className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                modoEnfoque ? "translate-x-4" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>
        <button
          onClick={handleLogout}
          className="mt-3 w-full text-left px-2 text-xs text-muted hover:text-foreground transition-colors"
        >
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
