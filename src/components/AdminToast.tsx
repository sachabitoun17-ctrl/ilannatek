"use client";

import { useEffect, useState } from "react";

export function AdminToast({ message }: { message: string | null }) {
  const [visible, setVisible] = useState(!!message);

  useEffect(() => {
    if (!message) return;
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 3000);
    return () => clearTimeout(t);
  }, [message]);

  if (!message || !visible) return null;

  const isSuccess = message.startsWith("✓");

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 px-4 py-3 rounded shadow-lg text-white text-sm font-medium transition-opacity ${
        isSuccess ? "bg-green-600" : "bg-red-600"
      }`}
    >
      {message}
    </div>
  );
}
