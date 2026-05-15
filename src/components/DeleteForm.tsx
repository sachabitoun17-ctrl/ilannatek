"use client";

export default function DeleteForm({
  action,
  id,
  confirmMsg = "Supprimer ?",
  label = "Supprimer",
}: {
  action: (id: string) => void | Promise<void>;
  id: string;
  confirmMsg?: string;
  label?: string;
}) {
  return (
    <form
      action={async () => {
        if (!confirm(confirmMsg)) return;
        await action(id);
      }}
    >
      <button className="text-red-600 hover:underline text-xs">{label}</button>
    </form>
  );
}
