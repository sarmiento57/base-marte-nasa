export default function App() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6">
      <div className="max-w-lg rounded-3xl border border-orange-500/30 bg-slate-900 p-10 text-center shadow-2xl">
        <span className="text-5xl">🚀</span>

        <h1 className="mt-5 text-4xl font-black text-orange-400">
          BASE MARTE
        </h1>

        <p className="mt-4 text-lg text-slate-300">
          NASA Space Apps Challenge 2026
        </p>

        <button className="mt-8 rounded-xl bg-orange-500 px-8 py-3 font-bold text-white transition-colors hover:bg-orange-600">
          Iniciar misión
        </button>
      </div>
    </main>
  )
}