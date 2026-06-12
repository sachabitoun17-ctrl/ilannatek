export const dynamic = "force-dynamic";
import { requireAdmin } from "@/lib/auth";
import { getCachedLocations } from "@/lib/cached";
import { getSettings } from "@/lib/settings";
import WidgetConfig from "./WidgetConfig";

export default async function AdminWidgetPage() {
  await requireAdmin();

  const [locations, settings] = await Promise.all([
    getCachedLocations(),
    getSettings(),
  ]);

  const siteBase = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");

  return (
    <div className="space-y-6">
      <div>
        <p className="section-title">Intégration</p>
        <h1 className="font-serif text-4xl font-medium text-brand-600 mt-1">
          Widget Planning
        </h1>
        <p className="text-sm text-stone2-500 mt-2 max-w-2xl">
          Intégrez le planning de votre studio sur votre site web ou tout autre
          site externe. Le widget se met à jour en temps réel depuis votre
          base de données.
        </p>
      </div>

      {!siteBase && (
        <div className="bg-amber-50 border border-amber-300 px-4 py-3 text-sm text-amber-800">
          <strong>NEXT_PUBLIC_SITE_URL</strong> n&apos;est pas défini.
          Configurez cette variable d&apos;environnement pour générer les URLs
          correctes dans les codes d&apos;intégration.
        </div>
      )}

      <WidgetConfig
        locations={locations.map((l) => ({ id: l.id, name: l.name }))}
        siteBase={siteBase || "https://votre-studio.fr"}
        studioName={settings.studioName}
      />
    </div>
  );
}
