import { headers } from "next/headers"
import { NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { db, schema } from "@/lib/db"

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return NextResponse.json({}, { status: 401 })
  const organizations = await db.select({ id: schema.tenants.id, name: schema.tenants.name })
    .from(schema.tenantMemberships).innerJoin(schema.tenants, eq(schema.tenants.id, schema.tenantMemberships.tenantId))
    .where(eq(schema.tenantMemberships.userId, session.user.id))
  return NextResponse.json({ organizations })
}
export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return NextResponse.json({}, { status: 401 })
  const { id } = await request.json()
  if (typeof id !== "string") return NextResponse.json({}, { status: 400 })
  const [membership] = await db.select().from(schema.tenantMemberships)
    .where(and(eq(schema.tenantMemberships.userId, session.user.id), eq(schema.tenantMemberships.tenantId, id))).limit(1)
  if (!membership) return NextResponse.json({}, { status: 403 })
  const response = NextResponse.json({ success: true })
  response.cookies.set("vibez_tenant_id", id, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 31536000 })
  return response
}
