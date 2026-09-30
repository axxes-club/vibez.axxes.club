import { requireContext } from "@/lib/context"
import { Sidebar } from "@/components/sidebar"
import { SignOut } from "@/components/sign-out"
import { Logo, LogoMark } from "@/components/logo"
import { product } from "@/product.config"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireContext()
  const items = [
    { href: "/dashboard", label: "Events" },
    ...(product.nav ?? []),
    ...product.resources.map((r) => ({ href: `/${r.key}`, label: r.label })),
  ]

  return (
    <div className="lg:flex">
      <Sidebar
        items={items}
        logo={<Logo />}
        mark={<LogoMark />}
        // /dashboard/events has no nav item of its own; Events stays lit there.
        activeAlso={["/dashboard/events"]}
        footer={
          <div className="space-y-3 text-xs">
            <div>
              <p className="font-medium text-text">{ctx.tenant.name}</p>
              <p className="truncate text-muted">{ctx.user.email}</p>
            </div>
            <div className="flex items-center justify-between">
              <a className="text-muted hover:text-text" href="https://handshake.axxes.club">← AXXES apps</a>
              <SignOut />
            </div>
          </div>
        }
      />
      <main className="min-w-0 flex-1 px-4 py-8 sm:px-8 lg:py-12">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  )
}
