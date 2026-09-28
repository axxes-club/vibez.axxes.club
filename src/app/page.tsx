import Link from "next/link"
import { Logo } from "@/components/logo"

export const metadata = {
  title: "Vibez — every room is a photobooth",
  description: "Put QR codes around your event. Guests scan, snap with a night-flash camera, and every photo lands on a live feed and TV wall.",
}

const STEPS = [
  { n: "01", t: "Print your codes", b: "Create an event, name a few spots — the bar, the dance floor, the photo wall — and print a poster for each." },
  { n: "02", t: "Guests scan & snap", b: "No app to install. The code opens a camera with our night-flash look, and one tap posts the shot." },
  { n: "03", t: "The room lights up", b: "Every photo lands on the live feed and the TV wall within seconds. Everyone sees the night unfold." },
]

const FEATURES = [
  { t: "Night flash", b: "A warm, grainy, date-stamped disposable-camera look — even in the darkest club." },
  { t: "Unlock on site", b: "Feeds open only for people who scan a code, and optionally only inside a geofence around the venue." },
  { t: "Live TV wall", b: "Full-screen slideshow for any screen at the venue, with a join code in the corner." },
  { t: "You stay in control", b: "Approve before posting, auto-hide reported shots, remove and ban with a tap." },
  { t: "Saved to Folders", b: "Every photo is backed up to your AXXES Folders library, ready to share after the event." },
  { t: "Built for afters.am", b: "The same feeds power VIBEZ on afters.am event pages — one system, every event." },
]

export default function Home() {
  return (
    <div className="min-h-dvh overflow-x-clip">
      <header className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <nav className="flex items-center gap-2 text-sm">
          <Link href="/dashboard" className="rounded-lg px-3 py-2 text-muted hover:text-text">Sign in</Link>
          <Link href="/dashboard" className="btn-primary">Create an event</Link>
        </nav>
      </header>

      <main>
        <section className="relative">
          <div aria-hidden className="pointer-events-none absolute -top-32 left-1/2 h-[480px] w-[760px] -translate-x-1/2 rounded-full bg-accent/25 blur-[140px]" />
          <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pb-24 pt-16 sm:px-6 lg:grid-cols-[1.2fr_1fr] lg:pt-24">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-accent">Vibez by AXXES</p>
              <h1 className="mt-5 text-5xl font-semibold leading-[1.02] tracking-tight sm:text-7xl">
                Every room is
                <br />a <span className="text-accent">photobooth.</span>
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
                Stick a few QR codes around your event. Guests scan, snap with a night-flash camera, and every photo pops up on a live
                feed and the big screen — instantly.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/dashboard" className="btn-primary px-5 py-3 text-base">Start your first event</Link>
                <a href="#how" className="btn-ghost px-5 py-3 text-base">How it works</a>
              </div>
              <p className="mt-4 text-sm text-muted">Free while in launch. No app for your guests to download.</p>
            </div>

            <div className="relative mx-auto w-[280px] sm:w-[300px]" aria-hidden>
              <div className="rounded-[44px] border border-line bg-panel p-3 shadow-2xl shadow-accent/20">
                <div className="relative aspect-[9/19] overflow-hidden rounded-[34px] bg-[radial-gradient(circle_at_50%_40%,#ffd6a8_0%,#ff7a59_18%,#6b1d4d_48%,#140a14_80%)]">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(255,255,255,0.55),transparent_42%)]" />
                  <div className="absolute left-4 right-4 top-5 flex justify-between text-[11px] font-medium text-white/90">
                    <span className="rounded-full bg-black/30 px-2.5 py-1">← Feed</span>
                    <span className="rounded-full bg-accent px-2.5 py-1 text-black">⚡ Flash</span>
                  </div>
                  <p className="absolute bottom-24 right-4 font-mono text-sm font-bold text-[#ff9d2e] [text-shadow:0_0_8px_rgba(255,120,20,0.9)]">&apos;26 09 28</p>
                  <div className="absolute bottom-6 left-1/2 size-16 -translate-x-1/2 rounded-full border-4 border-white bg-white/25" />
                </div>
              </div>
              <div className="card absolute -right-10 top-24 w-44 p-3 text-xs shadow-xl">
                <p className="font-medium">🔥 12 · Maya</p>
                <p className="mt-0.5 text-muted">just posted to the wall</p>
              </div>
            </div>
          </div>
        </section>

        <section id="how" className="border-y border-line/60 bg-panel/40">
          <div className="mx-auto max-w-6xl scroll-mt-16 px-4 py-24 sm:px-6">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Three steps. Zero friction.</h2>
            <ol className="mt-12 grid gap-6 md:grid-cols-3">
              {STEPS.map((s) => (
                <li key={s.n} className="card p-7">
                  <span className="font-mono text-sm text-accent">{s.n}</span>
                  <h3 className="mt-4 text-lg font-medium">{s.t}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{s.b}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
          <h2 className="max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">Made for real nights out.</h2>
          <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.t} className="bg-bg p-7">
                <h3 className="font-medium">{f.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{f.b}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
          <div className="card relative overflow-hidden p-10 text-center sm:p-16">
            <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--accent)_0%,transparent_60%)] opacity-20" />
            <h2 className="relative text-3xl font-semibold tracking-tight sm:text-5xl">Your next event, in everyone&apos;s camera roll.</h2>
            <Link href="/dashboard" className="btn-primary relative mt-8 px-6 py-3 text-base">Create an event — it&apos;s free</Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-line/60">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <Logo />
          <div className="flex gap-5">
            <a href="https://afters.am" className="hover:text-text">afters.am</a>
            <a href="https://folders.axxes.club" className="hover:text-text">Folders</a>
            <a href="https://tollbooth.axxes.club" className="hover:text-text">Tollbooth</a>
            <a href="https://axxes.club" className="hover:text-text">AXXES</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
