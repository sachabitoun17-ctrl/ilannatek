import Link from "next/link";

export default function NotFound() {
  return (
    <div className="max-w-xl mx-auto py-20 text-center space-y-4 px-4">
      <p className="font-serif text-8xl text-stone2-200">404</p>
      <h1 className="font-serif text-3xl font-medium text-brand-600">Page introuvable</h1>
      <p className="text-stone2-600 text-sm">
        Cette page n&apos;existe pas (plus). Retournez au planning pour réserver
        votre prochain cours.
      </p>
      <Link href="/schedule" className="btn-primary inline-block">
        Voir le planning
      </Link>
    </div>
  );
}
