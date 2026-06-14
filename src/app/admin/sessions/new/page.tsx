import { requireAdmin } from "@/lib/auth";
import SessionForm from "../SessionForm";
import { createSessionAction } from "../actions";

export default async function NewSessionPage() {
  await requireAdmin();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Nouveau cours</h1>
      <SessionForm action={createSessionAction} />
    </div>
  );
}
