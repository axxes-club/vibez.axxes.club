"use client"
import { useEffect, useState } from "react"
export function OrganizationSwitcher({ id, name }: { id: string; name: string }) {
  const [organizations, setOrganizations] = useState<{ id: string; name: string }[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  useEffect(() => { fetch("/api/organizations").then(r => r.ok ? r.json() : Promise.reject()).then(d => setOrganizations(d.organizations)).catch(() => setError("Could not load organizations")) }, [])
  return <details className="relative text-xs">
    <summary aria-label={`Switch organization (${name})`} title={`Switch organization (${name})`} className="cursor-pointer list-none truncate rounded p-1 hover:bg-panel-2">◎ <span className="[[data-collapsed=true]_&]:lg:hidden">{name}</span></summary>
    <div className="absolute bottom-full left-0 z-50 mb-2 max-h-[min(60vh,20rem)] overflow-y-auto overscroll-contain w-64 rounded-lg border border-line bg-panel p-2 shadow-xl">
      <p className="p-2 font-medium">Organizations</p>
      {organizations.map(org => <button key={org.id} disabled={busy} aria-current={org.id === id ? "true" : undefined} className="block w-full rounded p-2 text-left hover:bg-panel-2 disabled:opacity-50" onClick={async () => {
        setBusy(true); setError("")
        try { const r = await fetch("/api/organizations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: org.id }) }); if (!r.ok) throw Error(); window.location.assign("/dashboard") } catch { setError("Could not switch organization"); setBusy(false) }
      }}>{org.id === id ? "✓ " : ""}{org.name}</button>)}
      {error && <p role="alert" className="p-2">{error}</p>}
    </div>
  </details>
}
