import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 py-16">
        <div className="max-w-3xl">
          <div className="inline-flex rounded-full border border-fuchsia-500/20 bg-fuchsia-500/10 px-4 py-1 text-sm text-fuchsia-300">
            Meme portal · premium web app
          </div>

          <h1 className="mt-6 text-5xl font-black tracking-tight md:text-7xl">
            Wrong Hole
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-white/70">
            Fast play. Dark humor. Addictive loops.
          </p>

          <div className="mt-8 flex gap-4">
            <Link
              href="/app"
              className="rounded-2xl bg-fuchsia-500 px-6 py-3 font-semibold hover:bg-fuchsia-400"
            >
              Enter Portal
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}