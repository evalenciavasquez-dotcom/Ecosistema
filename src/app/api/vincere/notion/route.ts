import { NextResponse } from "next/server";

// Registro a Notion (PRD P0.9). Sigue el patrón del resto de la app: si las
// variables de entorno están configuradas, escribe de verdad; si no, responde
// "no configurado" sin romper — la plataforma confirma localmente y sigue.
//
// Requiere:
//   NOTION_TOKEN        — token de integración interna de Notion
//   NOTION_DATABASE_ID  — id de la base de datos donde se crean las páginas
//
// La base debe tener al menos una propiedad de título llamada "Name" (por
// defecto en Notion) y, opcionalmente, propiedades de texto "Proyecto",
// "Sección" y "Detalle" — si no existen, se omiten sin fallar.

interface NotionRequest {
  proyecto: string;
  seccion: string;
  titulo: string;
  detalle: string;
}

export async function POST(request: Request) {
  const token = process.env.NOTION_TOKEN;
  const databaseId = process.env.NOTION_DATABASE_ID;

  const body = (await request.json().catch(() => null)) as Partial<NotionRequest> | null;
  if (!body?.titulo) {
    return NextResponse.json({ error: "Falta el título del registro" }, { status: 400 });
  }

  if (!token || !databaseId) {
    return NextResponse.json({ configured: false });
  }

  const properties: Record<string, unknown> = {
    Name: { title: [{ text: { content: body.titulo } }] },
  };
  if (body.proyecto) properties["Proyecto"] = { rich_text: [{ text: { content: body.proyecto } }] };
  if (body.seccion) properties["Sección"] = { rich_text: [{ text: { content: body.seccion } }] };
  if (body.detalle) properties["Detalle"] = { rich_text: [{ text: { content: body.detalle.slice(0, 1800) } }] };

  try {
    const res = await fetch("https://api.notion.com/v1/pages", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28",
      },
      body: JSON.stringify({ parent: { database_id: databaseId }, properties }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return NextResponse.json(
        { configured: true, ok: false, error: `Notion respondió ${res.status}: ${detail.slice(0, 300)}` },
        { status: 502 }
      );
    }

    return NextResponse.json({ configured: true, ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error llamando a Notion";
    return NextResponse.json({ configured: true, ok: false, error: message }, { status: 502 });
  }
}
