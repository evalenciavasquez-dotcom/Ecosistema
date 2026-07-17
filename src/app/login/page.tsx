"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error || "Contraseña incorrecta");
        setLoading(false);
        return;
      }
      const from = params.get("from") || "/";
      router.push(from);
      router.refresh();
    } catch {
      setError("No se pudo conectar. Intenta de nuevo.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-accent-blue/15 text-accent-blue font-bold text-lg mb-4">
            EV
          </div>
          <h1 className="text-xl font-semibold tracking-tight">C.C.O. E.V.</h1>
          <p className="text-sm text-muted mt-1">
            Tu realidad analizada. Tus decisiones con dirección.
          </p>
        </div>
        <form
          onSubmit={handleSubmit}
          className="bg-surface border border-border-subtle rounded-2xl p-6 space-y-4"
        >
          <div>
            <label className="block text-xs uppercase tracking-wide text-muted mb-2">
              Acceso privado
            </label>
            <input
              type="password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Contraseña"
              className="w-full rounded-lg bg-surface-2 border border-border-subtle px-3 py-2.5 text-sm outline-none focus:border-accent-blue transition-colors"
            />
          </div>
          {error && <p className="text-sm text-accent-red">{error}</p>}
          <button
            type="submit"
            disabled={loading || !password}
            className="w-full rounded-lg bg-accent-blue text-white text-sm font-medium py-2.5 disabled:opacity-50 transition-opacity"
          >
            {loading ? "Verificando…" : "Entrar"}
          </button>
        </form>
        <p className="text-center text-xs text-muted mt-6">
          Sistema privado de un solo usuario
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
