import "./globals.css";
import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Ilannatek — Studio Booking",
  description: "Réservez vos cours de fitness boutique",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  return (
    <html lang="fr">
      <body className="min-h-screen bg-gray-50">
        <Navbar user={user} />
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </body>
    </html>
  );
}
