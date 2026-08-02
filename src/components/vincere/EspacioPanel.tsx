"use client";

import { useEffect, useState } from "react";
import { EVENTO_SIN_ESPACIO } from "@/lib/vincere/store";
import {
  formatearBytes,
  medirAlmacenamiento,
  nombreDeClave,
  UsoAlmacenamiento,
} from "@/lib/vincere/almacenamiento";

const COLOR: Record<UsoAlmacenamiento["estado"], string> = {
  holgado: "var(--vin-ok)",
  atento: "var(--vin-warn)",
  critico: "var(--vin-risk)",
};

export default function EspacioPanel() {
  const [uso, setUso] = useState<UsoAlmacenamiento | null>(null);
  const [fallo, setFallo] = useState(false);

  useEffect(() => {
    const medir = () => setUso(medirAlmacenamiento());
    // La primera medición sale del propio ciclo de render: en el servidor no
    // hay localStorage, y medir durante el render daría null allá y un valor
    // acá, que es una discrepancia de hidratación.
    const inicial = setTimeout(medir, 0);
    const alFallar = () => {
      setFallo(true);
      medir();
    };
    window.addEventListener(EVENTO_SIN_ESPACIO, alFallar);
    // Se remide cada tanto para que el número no quede viejo mientras se
    // trabaja, sin costar nada: leer localStorage es inmediato.
    const t = setInterval(medir, 20000);
    return () => {
      clearTimeout(inicial);
      window.removeEventListener(EVENTO_SIN_ESPACIO, alFallar);
      clearInterval(t);
    };
  }, []);

  if (!uso) return null;

  return (
    <div className="vin-card p-5">
      {fallo && (
        <div
          className="mb-4 rounded-xl p-4"
          style={{ background: "rgba(240,90,72,0.1)", border: "1px solid var(--vin-risk)" }}
        >
          <p className="vin-t-base leading-relaxed" style={{ color: "var(--vin-risk)" }}>
            El navegador dejó de guardar por falta de espacio. Lo que hagas desde ahora vive solo en esta pestaña y se
            pierde al recargar.
          </p>
          <p className="vin-muted vin-t-sm mt-2 leading-relaxed">
            Antes de cerrar: exporta desde C.C.O. → Configuración → «Exportar todos los datos». Después borra algún
            proyecto que ya no uses, o vacía su data.
          </p>
        </div>
      )}

      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <span className="vin-t-base font-medium">Espacio en este navegador</span>
        <span className="vin-t-sm tabular-nums" style={{ color: COLOR[uso.estado] }}>
          {formatearBytes(uso.bytes)} · {uso.pct}%
        </span>
      </div>

      <div className="vin-bar-track mb-3 h-2">
        <div className="h-full" style={{ width: `${Math.max(1, uso.pct)}%`, background: COLOR[uso.estado] }} />
      </div>

      <p className="vin-muted vin-t-sm leading-relaxed">
        {uso.estado === "holgado" &&
          "Hay espacio de sobra. Un proyecto trabajado a fondo pesa unos pocos cientos de kilobytes, así que cuatro o cinco caben sin problema."}
        {uso.estado === "atento" &&
          "Ya va por más de la mitad. Todavía no urge, pero conviene borrar los proyectos que ya no dirijas en vez de dejarlos ahí."}
        {uso.estado === "critico" &&
          "Está por llenarse. Cuando se llene, el navegador deja de guardar sin avisar y se pierde el trabajo al recargar. Borra o vacía algún proyecto ahora."}
      </p>

      {uso.porClave.length > 0 && (
        <div className="mt-3.5 flex flex-col gap-1.5">
          {uso.porClave.slice(0, 4).map((k) => (
            <div key={k.clave} className="flex items-baseline justify-between gap-3 vin-t-sm">
              <span className="vin-faint min-w-0 truncate">{nombreDeClave(k.clave)}</span>
              <span className="vin-faint shrink-0 tabular-nums">{formatearBytes(k.bytes)}</span>
            </div>
          ))}
        </div>
      )}

      <p className="vin-faint vin-t-sm mt-3.5 leading-relaxed">
        Esto es el navegador de este dispositivo. Si tienes base de datos conectada, la copia buena vive allá y esto es
        solo la caché local.
      </p>
    </div>
  );
}
