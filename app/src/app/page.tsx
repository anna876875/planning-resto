import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">Restaurant Planning</h1>
        <p className="mt-2 text-gray-500">Gestion de planning pour la restauration</p>
        <Link
          href="/planning"
          className="mt-6 inline-block rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-700"
        >
          Voir le planning →
        </Link>
      </div>
    </main>
  );
}
