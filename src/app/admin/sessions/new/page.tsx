import SessionForm from "../SessionForm";
import { createSessionAction } from "../actions";

export default function NewSessionPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Nouveau cours</h1>
      <SessionForm action={createSessionAction} />
    </div>
  );
}
