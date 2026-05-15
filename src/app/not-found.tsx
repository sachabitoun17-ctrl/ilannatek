import Link from "next/link";

export default function NotFound() {
  return (
    <div className="max-w-xl mx-auto py-20 text-center space-y-4">
      <p className="text-6xl">🧘</p>
      <h1 className="text-3xl font-bold">Page introuvable</h1>
      <p className="text-gray-600">
        Cette page n&apos;existe pas (plus). Retournez au planning pour réserver
        votre prochain cours.
      </p>
      <Link href="/schedule" className="btn-primary inline-block">
        Voir le planning
      </Link>
    </div>
  );
}
