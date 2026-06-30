import { env } from "@/lib/env";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-6 py-24">
      <main className="w-full max-w-lg text-center">
        <p className="text-sm font-medium uppercase tracking-widest text-zinc-500">
          Recruitment SaaS
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-zinc-900">
          {env.appName}
        </h1>
        <p className="mt-4 text-lg leading-8 text-zinc-600">
          Human-in-the-loop AI assistant for hiring. Monorepo scaffold is ready
          for Phase 0 development.
        </p>
      </main>
    </div>
  );
}
