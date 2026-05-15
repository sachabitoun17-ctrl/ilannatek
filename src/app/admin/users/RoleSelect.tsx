"use client";

import { setRoleAction } from "./actions";

export default function RoleSelect({
  userId,
  currentRole,
}: {
  userId: string;
  currentRole: string;
}) {
  return (
    <form action={setRoleAction}>
      <input type="hidden" name="id" value={userId} />
      <select
        name="role"
        defaultValue={currentRole}
        className="input py-1 text-xs"
        onChange={(e) => {
          const form = e.currentTarget.form;
          if (form) form.requestSubmit();
        }}
      >
        <option value="USER">USER</option>
        <option value="INSTRUCTOR">INSTRUCTOR</option>
        <option value="ADMIN">ADMIN</option>
      </select>
    </form>
  );
}
