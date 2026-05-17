"use client";

import { useState, useEffect } from "react";
import QRCode from "qrcode";

type Props = {
  sessionId: string;
  className: string;
  time: string;
  location: string;
};

export function BookingQRButton({ sessionId, className, time, location }: Props) {
  const [open, setOpen] = useState(false);
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const url = `${window.location.origin}/check-in/${sessionId}`;
    QRCode.toDataURL(url, {
      width: 240,
      margin: 2,
      color: { dark: "#1C1C1A", light: "#FAF7F1" },
    }).then(setDataUrl);
  }, [open, sessionId]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Afficher le QR de check-in"
        className="text-[10px] uppercase tracking-widest text-stone2-400 hover:text-brand-600 transition-colors border border-stone2-200 hover:border-brand-600 px-2 py-1"
      >
        QR
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-brand-600/80 backdrop-blur-sm p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-cream-50 w-full max-w-xs text-center shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-brand-600 px-6 py-5">
              <p className="text-[10px] uppercase tracking-[0.25em] text-accent-300 mb-1">
                Check-in
              </p>
              <h3 className="font-serif text-2xl text-cream-50 leading-tight">{className}</h3>
              <p className="text-sm text-stone2-300 mt-1">{time}</p>
              <p className="text-xs text-stone2-400 mt-0.5">{location}</p>
            </div>

            <div className="p-6 flex flex-col items-center gap-4">
              {dataUrl ? (
                <img
                  src={dataUrl}
                  alt="QR check-in"
                  className="w-44 h-44 border border-stone2-200"
                />
              ) : (
                <div className="w-44 h-44 bg-stone2-100 animate-pulse" />
              )}
              <p className="text-xs text-stone2-500 max-w-[200px]">
                Montrez ce code à l'accueil pour valider votre présence
              </p>
              <button
                onClick={() => setOpen(false)}
                className="btn-secondary w-full text-sm"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
