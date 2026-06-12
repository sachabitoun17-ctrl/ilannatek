"use client";

import { useState, useMemo } from "react";

type Location = { id: string; name: string };

function buildWidgetUrl(
  base: string,
  params: {
    days: number;
    color: string;
    theme: string;
    location: string;
    siteUrl: string;
    studio: string;
  }
): string {
  const p = new URLSearchParams();
  p.set("days", String(params.days));
  p.set("color", params.color);
  if (params.theme !== "light") p.set("theme", params.theme);
  if (params.location) p.set("location", params.location);
  if (params.siteUrl) p.set("siteUrl", params.siteUrl);
  if (params.studio) p.set("studio", params.studio);
  return `${base}/widget/schedule?${p.toString()}`;
}

export default function WidgetConfig({
  locations,
  siteBase,
  studioName,
}: {
  locations: Location[];
  siteBase: string;
  studioName: string;
}) {
  const [days, setDays] = useState(7);
  const [color, setColor] = useState("#3d2b1f");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [location, setLocation] = useState("");
  const [siteUrl, setSiteUrl] = useState(siteBase);
  const [studio, setStudio] = useState(studioName);
  const [height, setHeight] = useState(600);
  const [copied, setCopied] = useState<"iframe" | "js" | null>(null);

  const widgetUrl = useMemo(
    () => buildWidgetUrl(siteBase, { days, color, theme, location, siteUrl, studio }),
    [days, color, theme, location, siteUrl, studio, siteBase]
  );

  const iframeCode = `<iframe
  src="${widgetUrl}"
  width="100%"
  height="${height}"
  style="border:none;border-radius:4px;"
  loading="lazy"
  title="Planning ${studio}"
></iframe>`;

  const jsCode = `<div id="ilannatek-widget"></div>
<script>
(function(){
  var c=document.getElementById('ilannatek-widget');
  var f=document.createElement('iframe');
  f.src='${widgetUrl}';
  f.style.cssText='width:100%;height:${height}px;border:none;border-radius:4px;';
  f.loading='lazy';
  f.title='Planning ${studio}';
  c.appendChild(f);
})();
</script>`;

  function copyText(text: string, key: "iframe" | "js") {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  return (
    <div className="grid lg:grid-cols-2 gap-8 items-start">
      {/* ── Left: Configuration ── */}
      <div className="space-y-6">
        <div className="card space-y-5">
          <h2 className="font-medium text-brand-600">Configuration</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Nombre de jours</label>
              <input
                type="number"
                min={1}
                max={30}
                value={days}
                onChange={(e) => setDays(Math.min(30, Math.max(1, parseInt(e.target.value) || 7)))}
                className="input"
              />
              <p className="text-xs text-stone2-400 mt-1">Entre 1 et 30 jours</p>
            </div>

            <div>
              <label className="label">Thème</label>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value as "light" | "dark")}
                className="input"
              >
                <option value="light">Clair</option>
                <option value="dark">Sombre</option>
              </select>
            </div>

            <div>
              <label className="label">Couleur d&apos;accent</label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-10 w-16 cursor-pointer border border-stone2-200 bg-white p-0.5"
                />
                <input
                  type="text"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="input font-mono text-sm"
                  pattern="^#[0-9a-fA-F]{6}$"
                />
              </div>
            </div>

            <div>
              <label className="label">Hauteur de l&apos;iframe (px)</label>
              <input
                type="number"
                min={300}
                max={1200}
                value={height}
                onChange={(e) => setHeight(Math.min(1200, Math.max(300, parseInt(e.target.value) || 600)))}
                className="input"
              />
            </div>
          </div>

          {locations.length > 1 && (
            <div>
              <label className="label">Studio / Lieu</label>
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="input"
              >
                <option value="">Tous les lieux</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="label">Nom affiché dans le widget</label>
            <input
              type="text"
              value={studio}
              onChange={(e) => setStudio(e.target.value)}
              className="input"
              placeholder="Studio Boutique"
            />
          </div>

          <div>
            <label className="label">URL du site pour le bouton &ldquo;Réserver&rdquo;</label>
            <input
              type="url"
              value={siteUrl}
              onChange={(e) => setSiteUrl(e.target.value)}
              className="input font-mono text-sm"
              placeholder="https://votre-studio.fr"
            />
            <p className="text-xs text-stone2-400 mt-1">
              Le bouton redirigera vers <code className="bg-cream-100 px-1">{siteUrl}/schedule</code>
            </p>
          </div>
        </div>

        {/* Embed codes */}
        <div className="card space-y-4">
          <h2 className="font-medium text-brand-600">Code d&apos;intégration</h2>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="label mb-0">iframe (recommandé)</label>
              <button
                onClick={() => copyText(iframeCode, "iframe")}
                className="btn-secondary py-1 px-3 text-xs"
              >
                {copied === "iframe" ? "Copié ✓" : "Copier"}
              </button>
            </div>
            <pre className="bg-cream-100 border border-stone2-200 text-xs text-brand-600 p-3 overflow-x-auto rounded leading-relaxed whitespace-pre-wrap break-all">
              {iframeCode}
            </pre>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="label mb-0">Snippet JavaScript</label>
              <button
                onClick={() => copyText(jsCode, "js")}
                className="btn-secondary py-1 px-3 text-xs"
              >
                {copied === "js" ? "Copié ✓" : "Copier"}
              </button>
            </div>
            <pre className="bg-cream-100 border border-stone2-200 text-xs text-brand-600 p-3 overflow-x-auto rounded leading-relaxed whitespace-pre-wrap break-all">
              {jsCode}
            </pre>
          </div>

          <div className="bg-accent-50 border border-accent-200 px-4 py-3 text-sm text-brand-600">
            <p className="font-medium mb-1">API JSON publique</p>
            <p className="text-xs text-stone2-500 mb-2">
              Pour une intégration personnalisée dans votre propre composant.
            </p>
            <code className="text-xs bg-white border border-stone2-200 px-2 py-1 block overflow-x-auto">
              GET {siteBase}/api/widget/sessions?days={days}{location ? `&location=${location}` : ""}
            </code>
          </div>
        </div>
      </div>

      {/* ── Right: Live preview ── */}
      <div className="space-y-3 lg:sticky lg:top-8">
        <div className="flex items-center justify-between">
          <h2 className="font-medium text-brand-600">Prévisualisation en direct</h2>
          <a
            href={widgetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-ghost text-xs py-1 px-3"
          >
            Ouvrir dans un onglet →
          </a>
        </div>
        <div
          className="border border-stone2-200 overflow-hidden bg-stone2-100"
          style={{ height: `${Math.min(height, 700)}px` }}
        >
          <iframe
            key={widgetUrl}
            src={widgetUrl}
            className="w-full h-full"
            style={{ border: "none" }}
            title="Prévisualisation widget"
          />
        </div>
        <p className="text-xs text-stone2-400 text-center">
          La prévisualisation se met à jour automatiquement.
        </p>
      </div>
    </div>
  );
}
