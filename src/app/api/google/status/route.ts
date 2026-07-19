import { NextResponse } from "next/server";
import { isDbConfigured } from "@/lib/db/client";
import { getConnection, isGoogleConfigured } from "@/lib/google";

export async function GET() {
  if (!isGoogleConfigured()) {
    return NextResponse.json({ configured: false, connected: false });
  }
  if (!isDbConfigured()) {
    return NextResponse.json({ configured: true, connected: false, error: "Base de datos no configurada" });
  }
  const connection = await getConnection();
  if (!connection) {
    return NextResponse.json({ configured: true, connected: false });
  }
  return NextResponse.json({
    configured: true,
    connected: true,
    connectedAt: connection.connectedAt,
    lastGmailSync: connection.lastGmailSync,
    gmailLabelReady: !!connection.gmailLabelId,
  });
}
