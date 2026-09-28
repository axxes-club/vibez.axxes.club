import { notFound } from "next/navigation"
import { and, asc, eq } from "drizzle-orm"
import QRCode from "qrcode"
import { db, schema } from "@/lib/db"
import { requireContext } from "@/lib/context"

export const metadata = { title: "Print QR codes" }

// One poster per spot, sized for letter/A4 — print straight from the browser
export default async function PrintPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireContext()
  const { id } = await params
  const [event] = await db.select().from(schema.vibezEvents).where(and(eq(schema.vibezEvents.id, id), eq(schema.vibezEvents.tenantId, ctx.tenant.id))).catch(() => [])
  if (!event) notFound()
  const spots = await db.select().from(schema.vibezSpots).where(eq(schema.vibezSpots.eventId, event.id)).orderBy(asc(schema.vibezSpots.createdAt))
  const base = process.env.BETTER_AUTH_URL || "https://vibez.axxes.club"
  const qrs = await Promise.all(spots.map((s) => QRCode.toString(`${base}/s/${s.token}`, { type: "svg", margin: 0, errorCorrectionLevel: "M" })))

  return (
    <main className="bg-white text-black print:bg-white">
      <style>{`@page { size: auto; margin: 0 } @media print { .no-print { display: none } }`}</style>
      <p className="no-print sticky top-0 bg-black p-3 text-center text-sm text-white">
        {spots.length} poster{spots.length === 1 ? "" : "s"} · press ⌘P / Ctrl+P to print
      </p>
      {spots.map((s, i) => (
        <section key={s.id} className="flex min-h-dvh flex-col items-center justify-center gap-8 p-12 text-center [break-after:page]">
          <p className="font-mono text-sm uppercase tracking-[0.4em]">Vibez</p>
          <h1 className="max-w-2xl text-6xl font-black leading-none tracking-tight">Every room is a photobooth.</h1>
          <div className="w-[min(70vw,420px)] rounded-3xl border-[6px] border-black p-5" dangerouslySetInnerHTML={{ __html: qrs[i] }} />
          <div>
            <p className="text-3xl font-bold">Scan · Snap · It&apos;s on the wall</p>
            <p className="mt-2 text-lg text-neutral-600">{event.name} — {s.label}</p>
          </div>
        </section>
      ))}
    </main>
  )
}
