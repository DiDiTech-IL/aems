export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-4xl font-bold tracking-tight">AEMS</h1>
      <p className="text-lg text-gray-400">ALS/BLS Emergency Training Simulator</p>
      <div className="flex gap-4">
        <a
          href="/login"
          className="rounded-lg bg-blue-600 px-6 py-2 font-semibold hover:bg-blue-500 transition-colors"
        >
          Sign in
        </a>
        <a
          href="/dashboard"
          className="rounded-lg border border-gray-600 px-6 py-2 font-semibold hover:border-gray-400 transition-colors"
        >
          Dashboard
        </a>
      </div>
    </main>
  );
}
