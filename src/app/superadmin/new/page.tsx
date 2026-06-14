import Link from "next/link";
import { requireSuperAdmin } from "@/lib/auth";
import CreateClientForm from "./CreateClientForm";

export const dynamic = "force-dynamic";

export default async function NewClientPage() {
  await requireSuperAdmin();

  return (
    <div className="space-y-8">
      <div>
        <Link href="/superadmin" className="text-xs text-stone2-400 hover:text-cream-50 transition-colors">
          ← Console
        </Link>
        <h1 className="font-serif text-3xl text-cream-50 font-medium mt-3">Nouveau client</h1>
        <p className="text-stone2-400 text-sm mt-1">
          Créez un compte client, son premier studio et le compte administrateur associé.
        </p>
      </div>
      <CreateClientForm />
    </div>
  );
}
